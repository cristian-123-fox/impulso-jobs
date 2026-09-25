import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';

/**
 * Proveedor por defecto: el que usan los flujos que no ofrecen elección —la
 * asignación de plan desde el back-office y `POST /payments/confirm`—. Es el
 * manual. Lo que la empresa compra por autoservicio elige proveedor a través de
 * `PaymentProviderRegistry`.
 */
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
  /**
   * A dónde vuelve el usuario desde una pasarela alojada. Los adaptadores que
   * no redirigen (el manual) los ignoran.
   */
  returnUrls?: {
    success: string;
    cancel: string;
  };
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
  /**
   * Id de la suscripción en la pasarela, cuando el cobro la crea. Se guarda en
   * `company_subscriptions.provider_subscription_id` para reconocer las
   * renovaciones y para cancelarla.
   */
  providerSubscriptionId?: string | null;
}

/**
 * Lo que sale de interpretar un webhook. Distingue "no es auténtico" de "es
 * auténtico pero no nos interesa": lo primero es un 400 (alguien está probando
 * la ruta), lo segundo un 200 (si no, la pasarela reintenta durante días).
 */
export type ParsedWebhook =
  | { kind: 'invalid' }
  | { kind: 'ignored'; type: string }
  /** Cambia el estado de una orden que ya existe. */
  | { kind: 'payment'; event: PaymentEvent }
  /**
   * Cobro de un periodo nuevo de una suscripción recurrente. No hay orden
   * previa: se crea al recibirlo, y `event.externalReference` es el id de la
   * factura para que un reintento no duplique la orden.
   */
  | {
      kind: 'renewal';
      event: PaymentEvent;
      providerSubscriptionId: string;
      /** Importe cobrado, con IVA, en pesos. */
      amount: number;
      currency: string;
    }
  /** La pasarela dio por terminada la suscripción (impago, cancelación). */
  | {
      kind: 'subscription_ended';
      eventId: string;
      providerSubscriptionId: string;
    };

/**
 * Puerto de la pasarela de pago.
 *
 * La lógica de billing no conoce Stripe: habla con este contrato. Lo
 * implementan `ManualPaymentAdapter` (solicitud de pago que confirma el equipo)
 * y `StripePaymentAdapter`, y conviven: `PaymentProviderRegistry` elige el de
 * cada compra y cada orden guarda cuál la procesó.
 *
 * Es el mismo patrón que `MAILER_PORT` / `ConsoleMailerAdapter` en `iam/auth`.
 */
export interface PaymentProviderPort {
  /** Nombre corto del proveedor; se guarda en la orden y en los eventos. */
  readonly name: PaymentProvider;

  /** `false` si falta configuración (p. ej. Stripe sin clave secreta). */
  readonly enabled: boolean;

  /**
   * Métodos que este proveedor sabe cobrar, para pago único o recurrente. Se
   * cruzan con los que admite el importe (`PricingService`).
   */
  supportedMethods(recurring: boolean): PaymentMethod[];

  /** Abre el cobro y devuelve con qué estado nace la orden. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;

  /**
   * Traduce la carga cruda de un webhook, verificando su autenticidad. El
   * cuerpo llega **sin parsear** (`Buffer`): la firma se calcula sobre los
   * bytes exactos, y un `JSON.parse` + `stringify` ya no los reproduce.
   */
  parseEvent(payload: Buffer, signature?: string): Promise<ParsedWebhook>;

  /**
   * Estado real de una orden según el proveedor. Lo usa la reconciliación
   * (`POST /admin/payments/:id/sync`) cuando no llegó el webhook. `null` si el
   * proveedor no sabe nada o el cobro sigue abierto.
   */
  fetchStatus(externalReference: string): Promise<PaymentStatus | null>;

  /** Cancela un cobro pendiente (vale caducado, compra abandonada). */
  cancel(externalReference: string): Promise<void>;

  /**
   * Detiene una suscripción recurrente en la pasarela. `immediately: false`
   * deja terminar el periodo pagado (cancelar la renovación); `true` la corta
   * ya (el administrador retira o cambia el plan).
   */
  cancelRecurring(
    providerSubscriptionId: string,
    immediately: boolean,
  ): Promise<void>;
}
