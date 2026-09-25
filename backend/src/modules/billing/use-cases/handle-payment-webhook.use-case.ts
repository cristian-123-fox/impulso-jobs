import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import { ParsedWebhook } from '@/modules/billing/services/payment-provider.port';
import { PaymentProviderRegistry } from '@/modules/billing/services/payment-provider.registry';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';

/** Lo que se contesta a la pasarela. Sólo sirve para el log de Stripe. */
export interface WebhookAck {
  received: true;
  /** Qué se hizo con el evento, para depurar desde el dashboard. */
  outcome: 'applied' | 'duplicate' | 'ignored' | 'unknown_order';
}

/** Redondeo a centavos sin arrastrar error de coma flotante. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Entrada de los webhooks de pago (`POST /payments/:provider/webhook`).
 *
 * El adaptador verifica la firma y normaliza el evento; aquí sólo se decide qué
 * hacer con él. **Todo pago acaba en `SettlePaymentUseCase`**, que es quien
 * activa y quien garantiza que un evento reintentado no se aplique dos veces.
 *
 * Qué se responde importa: un 4xx/5xx hace que Stripe reintente durante días.
 * Así que sólo la firma inválida es un error; un evento auténtico que no nos
 * concierne (una orden que no es nuestra, una ya pagada) se contesta 200 y se
 * deja en el log. Un fallo inesperado sí se propaga como 500, para que el
 * reintento lo vuelva a intentar.
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    private readonly providers: PaymentProviderRegistry,
    private readonly settle: SettlePaymentUseCase,
    private readonly audit: AuditService,
  ) {}

  async handle(
    providerName: string,
    payload: Buffer | undefined,
    signature: string | undefined,
  ): Promise<WebhookAck> {
    const provider = this.providers.forOrder(providerName);
    const parsed: ParsedWebhook =
      provider && payload
        ? await provider.parseEvent(payload, signature)
        : { kind: 'invalid' };

    switch (parsed.kind) {
      case 'invalid':
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.PAYMENT_WEBHOOK_INVALID,
          'Webhook no válido.',
        );
      case 'ignored':
        return { received: true, outcome: 'ignored' };
      case 'payment':
        return this.settleKnown(() => this.settle.execute(parsed.event));
      case 'renewal':
        return this.renew(parsed);
      case 'subscription_ended':
        return this.endSubscription(parsed);
    }
  }

  /**
   * Liquida y traduce a 200 los dos rechazos que no son culpa de nadie: la
   * orden no es de esta plataforma (cuenta de Stripe compartida, evento de
   * prueba) o ya estaba pagada.
   */
  private async settleKnown(
    run: () => ReturnType<SettlePaymentUseCase['execute']>,
  ): Promise<WebhookAck> {
    try {
      const result = await run();
      return {
        received: true,
        outcome: result.applied ? 'applied' : 'duplicate',
      };
    } catch (error) {
      const code = this.errorCodeOf(error);
      if (code === ErrorCode.PAYMENT_ORDER_NOT_FOUND) {
        this.logger.warn(
          `Webhook de pago sin orden conocida: ${String(error)}`,
        );
        return { received: true, outcome: 'unknown_order' };
      }
      if (code === ErrorCode.PAYMENT_ALREADY_SETTLED) {
        return { received: true, outcome: 'duplicate' };
      }
      throw error;
    }
  }

  /**
   * Renovación anual: la pasarela cobró solo, así que no hay orden previa. Se
   * crea una por periodo —es lo que factura y lo que ve `/admin/pagos`— y se
   * liquida como cualquier otra, lo que extiende el periodo y **recarga el cupo
   * de talento**. La referencia es el id de la factura, así que un reintento
   * reutiliza la orden en vez de duplicarla.
   */
  private async renew(
    parsed: Extract<ParsedWebhook, { kind: 'renewal' }>,
  ): Promise<WebhookAck> {
    const subscription = await this.billing.findSubscriptionByProviderId(
      parsed.providerSubscriptionId,
    );
    if (!subscription) {
      this.logger.warn(
        `Renovación de ${parsed.providerSubscriptionId} sin suscripción local.`,
      );
      return { received: true, outcome: 'unknown_order' };
    }

    const existing = await this.billing.findOrderByExternalReference(
      parsed.event.externalReference,
    );
    if (!existing) {
      const plan = await this.plans.findById(subscription.planId);
      const taxRate = Number(plan?.taxRate ?? 0);
      const total = round2(parsed.amount);
      const subtotal = round2(total / (1 + taxRate));

      const order = new PromotionOrder();
      order.subscriptionId = subscription.id;
      order.companyId = subscription.companyId;
      order.provider = parsed.event.provider;
      order.paymentMethod = PaymentMethod.CARD;
      order.paymentStatus = PaymentStatus.AWAITING_PAYMENT;
      order.subtotal = subtotal.toFixed(2);
      order.taxAmount = round2(total - subtotal).toFixed(2);
      order.total = total.toFixed(2);
      order.currency = parsed.currency;
      order.installments = 1;
      order.externalReference = parsed.event.externalReference;
      await this.billing.saveOrder(order);

      await this.audit.record({
        action: 'subscriptions.renewal',
        entity: 'company_subscription',
        entityId: subscription.id,
        metadata: {
          provider: parsed.event.provider,
          invoice: parsed.event.externalReference,
          total,
        },
      });
    }

    return this.settleKnown(() => this.settle.execute(parsed.event));
  }

  /**
   * La pasarela terminó la suscripción (se agotaron los reintentos de cobro o
   * llegó el fin de periodo tras cancelar la renovación). Sólo se apaga la
   * renovación: el periodo ya pagado se respeta y lo caduca el job
   * `billing:expire`, igual que una suscripción manual.
   */
  private async endSubscription(
    parsed: Extract<ParsedWebhook, { kind: 'subscription_ended' }>,
  ): Promise<WebhookAck> {
    const subscription = await this.billing.findSubscriptionByProviderId(
      parsed.providerSubscriptionId,
    );
    if (!subscription) return { received: true, outcome: 'unknown_order' };
    if (!subscription.autoRenew)
      return { received: true, outcome: 'duplicate' };

    subscription.autoRenew = false;
    await this.billing.saveSubscription(subscription);

    await this.audit.record({
      action: 'subscriptions.provider_ended',
      entity: 'company_subscription',
      entityId: subscription.id,
      metadata: {
        providerSubscriptionId: parsed.providerSubscriptionId,
        eventId: parsed.eventId || randomUUID(),
      },
    });
    return { received: true, outcome: 'applied' };
  }

  private errorCodeOf(error: unknown): string | undefined {
    if (error instanceof AppException) {
      return (error.getResponse() as { errorCode?: string }).errorCode;
    }
    return undefined;
  }
}
