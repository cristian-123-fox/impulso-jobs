import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  CheckoutRequest,
  CheckoutResult,
  ParsedWebhook,
  PaymentProviderPort,
} from '@/modules/billing/services/payment-provider.port';

/** Versión de la API fijada. Coincide con los tipos de `stripe@17.5.0`. */
const DEFAULT_API_VERSION: Stripe.LatestApiVersion = '2024-12-18.acacia';

/**
 * Cuánto vive una sesión de Checkout abierta. Stripe exige al menos 30 min.
 * Pasado este tiempo llega `checkout.session.expired`, que libera la promoción
 * o la suscripción reservada: sin él, una compra abandonada bloquearía la
 * vacante durante 24 h (el valor por defecto de Stripe).
 */
const SESSION_TTL_SECONDS = 60 * 60;

/** Días que Stripe deja vivo el vale de OXXO. */
const OXXO_VOUCHER_DAYS = 3;

/**
 * Métodos que se cobran por Checkout. SPEI queda fuera a propósito: en Stripe
 * México exige un `Customer` con saldo bancario y conciliar transferencias
 * parciales; para eso está la solicitud de pago (`ManualPaymentAdapter`).
 * Una suscripción sólo admite tarjeta: OXXO y MSI son pago único.
 */
const ONE_TIME_METHODS: readonly PaymentMethod[] = [
  PaymentMethod.CARD,
  PaymentMethod.MSI,
  PaymentMethod.OXXO,
];
const RECURRING_METHODS: readonly PaymentMethod[] = [PaymentMethod.CARD];

/**
 * Stripe Checkout (página de pago alojada por Stripe).
 *
 * **El importe sale siempre de nuestra BD** (`price_data`), no de un Price
 * creado en el dashboard de Stripe: el catálogo y sus precios se editan en
 * `/admin/planes`, y un Price de Stripe desincronizado cobraría otra cosa.
 *
 * La activación **nunca** ocurre al volver del Checkout —esa URL la puede
 * teclear cualquiera—: la dispara el webhook firmado, que pasa por
 * `SettlePaymentUseCase` como cualquier otro cobro.
 *
 * Sin `STRIPE_SECRET_KEY` el adaptador queda deshabilitado y la plataforma
 * ofrece sólo la solicitud de pago.
 */
@Injectable()
export class StripePaymentAdapter implements PaymentProviderPort {
  readonly name = PaymentProvider.STRIPE;

  private readonly logger = new Logger('StripePayment');
  private readonly client: Stripe | null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const apiVersion =
      (process.env.STRIPE_API_VERSION?.trim() as
        Stripe.LatestApiVersion | undefined) || DEFAULT_API_VERSION;

    this.client = secretKey
      ? new Stripe(secretKey, {
          apiVersion,
          appInfo: { name: 'Impulso Jobs' },
        })
      : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  supportedMethods(recurring: boolean): PaymentMethod[] {
    return [...(recurring ? RECURRING_METHODS : ONE_TIME_METHODS)];
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const stripe = this.requireClient();
    if (!request.returnUrls) {
      throw new Error('Stripe Checkout necesita las URL de retorno.');
    }

    const metadata = { orderId: request.orderId, companyId: request.companyId };
    const unitAmount = this.toCents(request.total);
    const currency = request.currency.toLowerCase();

    const params: Stripe.Checkout.SessionCreateParams = {
      client_reference_id: request.orderId,
      metadata,
      success_url: request.returnUrls.success,
      cancel_url: request.returnUrls.cancel,
      locale: 'es-419',
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };

    if (request.recurring) {
      params.mode = 'subscription';
      params.payment_method_types = ['card'];
      params.line_items = [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            recurring: { interval: 'year' },
            product_data: { name: request.concept },
          },
        },
      ];
      // La suscripción de Stripe lleva la orden y la empresa: es lo que se
      // mira en el dashboard cuando hay que cruzar un cobro con una cuenta.
      params.subscription_data = { metadata };
    } else {
      params.mode = 'payment';
      params.line_items = [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name: request.concept },
          },
        },
      ];
      params.payment_intent_data = { metadata };

      if (request.method === PaymentMethod.OXXO) {
        params.payment_method_types = ['oxxo'];
        params.payment_method_options = {
          oxxo: { expires_after_days: OXXO_VOUCHER_DAYS },
        };
      } else {
        params.payment_method_types = ['card'];
        if (request.method === PaymentMethod.MSI) {
          // El plazo lo elige el cliente en la página de Stripe, entre los que
          // su tarjeta y la cuenta tengan habilitados.
          params.payment_method_options = {
            card: { installments: { enabled: true } },
          };
        }
      }
    }

    try {
      const session = await stripe.checkout.sessions.create(params, {
        // Reintentar la misma orden no abre dos sesiones.
        idempotencyKey: `checkout_${request.orderId}`,
      });
      return {
        externalReference: session.id,
        checkoutUrl: session.url,
        status: PaymentStatus.AWAITING_PAYMENT,
        voucher: null,
      };
    } catch (error) {
      this.logger.error(
        `No se pudo abrir el Checkout de la orden ${request.orderId}: ${this.describe(error)}`,
      );
      throw new AppException(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.PAYMENT_PROVIDER_ERROR,
        'No pudimos conectar con la pasarela de pago. Intenta de nuevo en unos minutos.',
      );
    }
  }

  parseEvent(payload: Buffer, signature?: string): Promise<ParsedWebhook> {
    const stripe = this.client;
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !secret || !signature) {
      return Promise.resolve({ kind: 'invalid' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      this.logger.warn(`Webhook con firma inválida: ${this.describe(error)}`);
      return Promise.resolve({ kind: 'invalid' });
    }

    return Promise.resolve(this.normalize(event));
  }

  async fetchStatus(externalReference: string): Promise<PaymentStatus | null> {
    const stripe = this.requireClient();
    try {
      const session =
        await stripe.checkout.sessions.retrieve(externalReference);
      if (
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required'
      ) {
        return PaymentStatus.PAID;
      }
      if (session.status === 'expired') return PaymentStatus.FAILED;
      return null;
    } catch (error) {
      this.logger.error(
        `No se pudo consultar la sesión ${externalReference}: ${this.describe(error)}`,
      );
      throw new AppException(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.PAYMENT_PROVIDER_ERROR,
        'No pudimos consultar el pago en Stripe.',
      );
    }
  }

  /**
   * Expira la sesión si sigue abierta. Si ya no lo está (se pagó, expiró o es
   * un vale OXXO emitido), Stripe responde error y se ignora: lo que manda es
   * el webhook que llegue después.
   */
  async cancel(externalReference: string): Promise<void> {
    const stripe = this.client;
    if (!stripe || !externalReference.startsWith('cs_')) return;
    try {
      await stripe.checkout.sessions.expire(externalReference);
    } catch (error) {
      this.logger.log(
        `La sesión ${externalReference} no se pudo expirar (ya no estaba abierta): ${this.describe(error)}`,
      );
    }
  }

  async cancelRecurring(
    providerSubscriptionId: string,
    immediately: boolean,
  ): Promise<void> {
    const stripe = this.requireClient();
    try {
      if (immediately) {
        await stripe.subscriptions.cancel(providerSubscriptionId);
      } else {
        await stripe.subscriptions.update(providerSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      this.logger.error(
        `No se pudo cancelar la suscripción ${providerSubscriptionId}: ${this.describe(error)}`,
      );
      throw new AppException(
        HttpStatus.BAD_GATEWAY,
        ErrorCode.PAYMENT_PROVIDER_ERROR,
        'No pudimos cancelar la suscripción en Stripe. Intenta de nuevo.',
      );
    }
  }

  // ------------------------------------------------------------- privados

  /**
   * Eventos que se escuchan (hay que darlos de alta en el endpoint del
   * dashboard de Stripe):
   *
   * - `checkout.session.completed` — pago con tarjeta aprobado, o vale OXXO
   *   emitido (todavía sin pagar).
   * - `checkout.session.async_payment_succeeded` / `_failed` — el OXXO se pagó
   *   o caducó.
   * - `checkout.session.expired` — el cliente abandonó el Checkout.
   * - `invoice.paid` — renovación anual de una suscripción.
   * - `customer.subscription.deleted` — Stripe dio la suscripción por
   *   terminada (cancelación al fin de periodo o impago definitivo).
   */
  private normalize(event: Stripe.Event): ParsedWebhook {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const paid =
          session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required';
        return {
          kind: 'payment',
          event: {
            provider: this.name,
            eventId: event.id,
            type: event.type,
            externalReference: session.id,
            // Un OXXO completa el Checkout sin pagar: la orden sigue esperando.
            status: paid ? PaymentStatus.PAID : PaymentStatus.AWAITING_PAYMENT,
            providerSubscriptionId: this.idOf(session.subscription),
          },
        };
      }
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object;
        return {
          kind: 'payment',
          event: {
            provider: this.name,
            eventId: event.id,
            type: event.type,
            externalReference: session.id,
            status:
              event.type === 'checkout.session.async_payment_succeeded'
                ? PaymentStatus.PAID
                : PaymentStatus.FAILED,
          },
        };
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = this.idOf(invoice.subscription);
        // El primer cobro (`subscription_create`) ya lo liquida
        // `checkout.session.completed`: aquí sólo interesan las renovaciones.
        if (
          invoice.billing_reason !== 'subscription_cycle' ||
          !subscriptionId
        ) {
          return { kind: 'ignored', type: event.type };
        }
        const periodEnd = invoice.lines.data[0]?.period?.end;
        return {
          kind: 'renewal',
          providerSubscriptionId: subscriptionId,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          event: {
            provider: this.name,
            eventId: event.id,
            type: event.type,
            externalReference: invoice.id,
            status: PaymentStatus.PAID,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            providerSubscriptionId: subscriptionId,
          },
        };
      }
      case 'customer.subscription.deleted':
        return {
          kind: 'subscription_ended',
          eventId: event.id,
          providerSubscriptionId: event.data.object.id,
        };
      default:
        return { kind: 'ignored', type: event.type };
    }
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_PROVIDER_NOT_AVAILABLE,
        'El pago en línea no está disponible en este momento.',
      );
    }
    return this.client;
  }

  private idOf(
    value: string | { id: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    return typeof value === 'string' ? value : value.id;
  }

  /** Mismo redondeo que `PricingService.toCents`. */
  private toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
