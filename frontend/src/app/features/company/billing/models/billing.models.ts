export enum PaymentMethod {
  CARD = 'CARD',
  OXXO = 'OXXO',
  SPEI = 'SPEI',
  /** Meses sin intereses (tarjeta a plazos). */
  MSI = 'MSI',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: 'Tarjeta',
  [PaymentMethod.OXXO]: 'OXXO',
  [PaymentMethod.SPEI]: 'Transferencia SPEI',
  [PaymentMethod.MSI]: 'Meses sin intereses',
};

/** Quién procesa el cobro: `stripe` = pago en línea; `manual` = solicitud. */
export enum PaymentProvider {
  MANUAL = 'manual',
  STRIPE = 'stripe',
}

/** Medio de pago disponible y sus métodos (`GET /payments/options`). */
export interface PaymentProviderOption {
  provider: PaymentProvider;
  /** Pago único (promoción de vacante). */
  methods: PaymentMethod[];
  /** Suscripción recurrente. */
  recurringMethods: PaymentMethod[];
}

/** Estados de una orden que todavía se pueden pagar o retirar. */
export const OPEN_PAYMENT_STATUSES: readonly string[] = [
  'PENDING',
  'AWAITING_PAYMENT',
];

export enum PromotionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const PROMOTION_STATUS_LABELS: Record<string, string> = {
  [PromotionStatus.PENDING_PAYMENT]: 'Pendiente de pago',
  [PromotionStatus.ACTIVE]: 'Activa',
  [PromotionStatus.EXPIRED]: 'Vencida',
  [PromotionStatus.CANCELLED]: 'Cancelada',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  ACTIVE: 'Activa',
  PAST_DUE: 'Vencida',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  AWAITING_PAYMENT: 'Esperando pago',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

export interface PriceBreakdown {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export interface MethodAvailability {
  method: PaymentMethod;
  available: boolean;
  /** Por qué no se puede usar (p. ej. OXXO tiene tope de importe). */
  reason: string | null;
}

export interface PlanFeatureValue {
  code: string;
  name: string;
  valueType: string;
  isIncluded: boolean;
  value: string | null;
}

/** Plan publicado, tal como lo ve la empresa (`GET /plans`). */
export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  planType: string;
  billingPeriod: string;
  validityDays: number | null;
  postingQuota: number | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  price: PriceBreakdown;
  paymentMethods: MethodAvailability[];
  features: PlanFeatureValue[];
}

export interface Order {
  id: string;
  provider: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  installments: number;
  externalReference: string | null;
  voucherUrl: string | null;
  voucherReference: string | null;
  voucherExpiresAt: string | null;
  cfdiUuid: string | null;
  paidAt: string | null;
}

export interface Promotion {
  id: string;
  vacancyId: string;
  planId: string;
  planName: string | null;
  status: string;
  pricePaid: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  order: Order | null;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string | null;
  status: string;
  startsAt: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  order: Order | null;
}

/**
 * Folio corto de la orden: lo que la empresa cita al pagar y lo que el
 * back-office ve en `/admin/pagos`. Espejado en
 * `features/admin/payments/models/payments.models.ts`.
 */
export function orderFolio(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Sin pasarela, el cobro lo confirma a mano el equipo: la empresa tiene que
 * saber que no hay nada más que hacer en pantalla.
 */
export function isManualOrder(order: Order): boolean {
  return order.provider === 'manual';
}

/** Lo que devuelve abrir un cobro: a dónde ir y en qué estado quedó. */
export interface Checkout {
  orderId: string;
  checkoutUrl: string | null;
  order: Order;
}

export interface PromotionsPage {
  items: Promotion[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
