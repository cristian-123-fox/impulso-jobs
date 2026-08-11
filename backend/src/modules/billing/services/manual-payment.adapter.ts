import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  CheckoutRequest,
  CheckoutResult,
  PaymentEvent,
  PaymentProviderPort,
} from '@/modules/billing/services/payment-provider.port';

/** Días que vive un vale de OXXO antes de caducar. */
const VOUCHER_TTL_DAYS = 3;

/**
 * Adaptador de pago **manual**, para desarrollo y para operar sin pasarela.
 *
 * No cobra nada: registra el intento y deja la orden en `AWAITING_PAYMENT`. La
 * confirmación se hace a mano contra `POST /payments/confirm` (permiso
 * `subscriptions.manage`), que es el mismo camino que recorrerá el webhook de
 * Stripe el día que exista la cuenta.
 *
 * Es deliberadamente el equivalente de `ConsoleMailerAdapter`: permite ejercer
 * el flujo completo de punta a punta sin credenciales de terceros.
 */
@Injectable()
export class ManualPaymentAdapter implements PaymentProviderPort {
  readonly name = 'manual';

  private readonly logger = new Logger('ManualPayment');

  createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const externalReference = `manual_${randomUUID()}`;

    this.logger.log(
      `Cobro simulado ${externalReference} · orden ${request.orderId} · ` +
        `${request.total} ${request.currency} · ${request.method} · ` +
        `confirma con POST /payments/confirm { "externalReference": "${externalReference}" }`,
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

  /**
   * Sin pasarela no hay webhooks: la confirmación manual construye el evento
   * en el controlador. Aquí no hay nada que verificar.
   */
  parseEvent(): Promise<PaymentEvent | null> {
    return Promise.resolve(null);
  }

  /** El proveedor manual no sabe nada: la reconciliación no aplica. */
  fetchStatus(): Promise<PaymentStatus | null> {
    return Promise.resolve(null);
  }

  cancel(externalReference: string): Promise<void> {
    this.logger.log(`Cobro simulado ${externalReference} cancelado.`);
    return Promise.resolve();
  }

  private voucherExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + VOUCHER_TTL_DAYS);
    return expiry;
  }
}
