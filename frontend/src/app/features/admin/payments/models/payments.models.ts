/** Orden de cobro vista desde el back-office (`GET /admin/payments`). */
export interface AdminPayment {
  id: string;
  kind: 'PROMOTION' | 'SUBSCRIPTION';
  companyId: string;
  companyName: string | null;
  planName: string | null;
  vacancyId: string | null;
  vacancyTitle: string | null;
  provider: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  installments: number;
  externalReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminPaymentsPage {
  items: AdminPayment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Filtro del listado. `OPEN` es la cola —`PENDING` + `AWAITING_PAYMENT`—; el
 * resto son estados exactos. Vacío = todas.
 */
export type AdminPaymentFilter = 'OPEN' | 'PAID' | 'FAILED' | '';

/** Estados que todavía se pueden confirmar o rechazar. */
export const OPEN_PAYMENT_STATUSES: readonly string[] = [
  'PENDING',
  'AWAITING_PAYMENT',
];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  AWAITING_PAYMENT: 'Esperando pago',
  PAID: 'Pagado',
  FAILED: 'Rechazado',
  REFUNDED: 'Reembolsado',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: 'Tarjeta',
  OXXO: 'OXXO',
  SPEI: 'Transferencia SPEI',
  MSI: 'Meses sin intereses',
};

/**
 * Folio corto de la orden: lo que la empresa ve en su panel y cita al pagar.
 * Son los primeros 8 caracteres del UUID; espejado en
 * `features/company/billing/models/billing.models.ts`.
 */
export function orderFolio(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}
