import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
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

/** Días que vive un vale de OXXO antes de caducar. */
const VOUCHER_TTL_DAYS = 3;

/**
 * Lo que la empresa puede elegir como "solicitud de pago". Sin pasarela, lo
 * único que el equipo sabe verificar es una transferencia; ofrecer "tarjeta"
 * aquí prometería un cobro que nadie va a hacer. La asignación de plan desde el
 * back-office no pasa por esta lista: registra ventas cerradas fuera de la
 * plataforma con el método que sea.
 */
const REQUEST_METHODS: readonly PaymentMethod[] = [PaymentMethod.SPEI];

/**
 * Adaptador de pago **manual**: la "solicitud de pago".
 *
 * No cobra nada: registra el intento y deja la orden en `AWAITING_PAYMENT`. La
 * confirmación la hace el equipo en `/admin/pagos` (o `POST /payments/confirm`
 * con la referencia), que entrega a `SettlePaymentUseCase` el mismo evento que
 * mandaría una pasarela.
 *
 * Es deliberadamente el equivalente de `ConsoleMailerAdapter`: permite ejercer
 * el flujo completo de punta a punta sin credenciales de terceros, y convive
 * con Stripe para quien prefiere pagar por transferencia.
 */
@Injectable()
export class ManualPaymentAdapter implements PaymentProviderPort {
  readonly name = PaymentProvider.MANUAL;
  readonly enabled = true;

  private readonly logger = new Logger('ManualPayment');

  supportedMethods(): PaymentMethod[] {
    return [...REQUEST_METHODS];
  }

  createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const externalReference = `manual_${randomUUID()}`;

    this.logger.log(
      `Solicitud de pago ${externalReference} · orden ${request.orderId} · ` +
        `${request.total} ${request.currency} · ${request.method} · ` +
        'confírmala en /admin/pagos',
    );

    // OXXO entrega un vale imprimible con caducidad; se reproduce para que el
    // front pueda maquetar el caso "pago pendiente en tienda".
    const voucher =
      request.method === PaymentMethod.OXXO
        ? {
            url: `https://pagos.local/vale/${externalReference}`,
            reference: externalReference.replace('manual_', '').slice(0, 14),
            expiresAt: this.voucherExpiry(),
          }
        : null;

    return Promise.resolve({
      externalReference,
      checkoutUrl: null,
      status: PaymentStatus.AWAITING_PAYMENT,
      voucher,
    });
  }

  /** Sin pasarela no hay webhooks que aceptar. */
  parseEvent(): Promise<ParsedWebhook> {
    return Promise.resolve({ kind: 'invalid' });
  }

  /** El proveedor manual no sabe nada: la reconciliación no aplica. */
  fetchStatus(): Promise<PaymentStatus | null> {
    return Promise.resolve(null);
  }

  cancel(externalReference: string): Promise<void> {
    this.logger.log(`Solicitud de pago ${externalReference} cancelada.`);
    return Promise.resolve();
  }

  /** Nada que detener: la renovación manual no cobra sola. */
  cancelRecurring(): Promise<void> {
    return Promise.resolve();
  }

  private voucherExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + VOUCHER_TTL_DAYS);
    return expiry;
  }
}
