import {
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

/** Lo que la plataforma necesita para abrir un cobro. */
export interface CheckoutRequest {
  orderId: string;
  companyId: string;
  /** Descripción que verá el cliente en la pasarela. */
  concept: string;
  /** Total **con IVA**, en pesos. El adaptador convierte a centavos. */
  total: number;
  currency: string;
  method: PaymentMethod;
  installments: number;
  /** `true` para una suscripción recurrente (`mode=subscription`). */
  recurring: boolean;
  /** Identificadores del plan en la pasarela, si los tiene. */
  providerPriceId?: string | null;
}

export interface CheckoutResult {
  /** Referencia del intento en la pasarela; se guarda en la orden. */
  externalReference: string;
  /** A dónde redirigir al usuario. Nulo si el cobro no requiere redirección. */
  checkoutUrl: string | null;
  /**
   * Estado con el que nace la orden. Tarjeta → `AWAITING_PAYMENT` hasta que
   * el proveedor confirme; OXXO/SPEI también, pero además traen vale.
   */
  status: PaymentStatus;
  voucher?: {
    url: string;
    reference: string;
    expiresAt: Date;
  } | null;
}

/** Evento del proveedor ya normalizado, listo para aplicar. */
export interface PaymentEvent {
  provider: string;
  /** Id del evento en el proveedor. Base de la idempotencia. */
  eventId: string;
  type: string;
  /** Referencia de la orden a la que afecta. */
  externalReference: string;
  status: PaymentStatus;
  /** Fin del periodo pagado, sólo en suscripciones. */
  currentPeriodEnd?: Date | null;
}

/**
 * Puerto de la pasarela de pago.
 *
 * La lógica de billing no conoce Stripe: habla con este contrato. Hoy lo
 * implementa `ManualPaymentAdapter` (no hay cuenta de Stripe ni entidad legal
 * mexicana todavía); cuando exista, `StripePaymentAdapter` implementará lo
 * mismo y sólo cambia el binding en `billing.module.ts`.
 *
 * Es el mismo patrón que `MAILER_PORT` / `ConsoleMailerAdapter` en `iam/auth`.
 */
export interface PaymentProviderPort {
  /** Nombre corto del proveedor; se guarda en la orden y en los eventos. */
  readonly name: string;

  /** Abre el cobro y devuelve con qué estado nace la orden. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;

  /**
   * Traduce la carga cruda de un webhook a un `PaymentEvent`, verificando su
   * autenticidad. Devuelve `null` si la firma no valida.
   */
  parseEvent(
    payload: unknown,
    signature?: string,
  ): Promise<PaymentEvent | null>;

  /**
   * Estado real de una orden según el proveedor. Lo usa la reconciliación de
   * cobros asíncronos (OXXO/SPEI) cuando no llegó el webhook.
   */
  fetchStatus(externalReference: string): Promise<PaymentStatus | null>;

  /** Cancela un cobro pendiente (vale caducado, promoción anulada). */
  cancel(externalReference: string): Promise<void>;
}
