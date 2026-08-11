/** Modelo de cobro del plan (espeja `PlanType` del backend). */
export enum PlanType {
  /** Media / Alta: pago único que promociona **una** vacante. */
  PER_PUBLICATION = 'PER_PUBLICATION',
  /** Anual: suscripción de la empresa, no de una vacante. */
  ANNUAL_SUBSCRIPTION = 'ANNUAL_SUBSCRIPTION',
}

export enum BillingPeriod {
  ONE_TIME = 'ONE_TIME',
  ANNUAL = 'ANNUAL',
}

/** Cómo se interpreta el valor del beneficio dentro de un plan. */
export enum FeatureValueType {
  BOOLEAN = 'BOOLEAN',
  NUMERIC = 'NUMERIC',
  PERCENT = 'PERCENT',
  TEXT = 'TEXT',
}

export enum PaymentMethod {
  CARD = 'CARD',
  OXXO = 'OXXO',
  SPEI = 'SPEI',
  MSI = 'MSI',
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  [PlanType.PER_PUBLICATION]: 'Por publicación',
  [PlanType.ANNUAL_SUBSCRIPTION]: 'Suscripción anual',
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  [BillingPeriod.ONE_TIME]: 'Pago único',
  [BillingPeriod.ANNUAL]: 'Anual',
};

export const FEATURE_VALUE_TYPE_LABELS: Record<FeatureValueType, string> = {
  [FeatureValueType.BOOLEAN]: 'Sí / No',
  [FeatureValueType.NUMERIC]: 'Numérico',
  [FeatureValueType.PERCENT]: 'Porcentaje',
  [FeatureValueType.TEXT]: 'Texto',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: 'Tarjeta',
  [PaymentMethod.OXXO]: 'OXXO',
  [PaymentMethod.SPEI]: 'SPEI',
  [PaymentMethod.MSI]: 'Meses sin intereses',
};

/** Valor especial de un beneficio numérico: sin tope. */
export const UNLIMITED_VALUE = '-1';

/** Desglose con IVA que calcula el backend. */
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
  reason: string | null;
}

/** Un beneficio tal como aplica a un plan concreto. */
export interface PlanFeatureValue {
  code: string;
  name: string;
  valueType: FeatureValueType;
  isIncluded: boolean;
  value: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  planType: PlanType;
  billingPeriod: BillingPeriod;
  validityDays: number | null;
  postingQuota: number | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  price: PriceBreakdown;
  paymentMethods: MethodAvailability[];
  features: PlanFeatureValue[];
}

/** Beneficio del catálogo, independiente de los planes que lo usan. */
export interface PlanFeatureCatalogItem {
  code: string;
  name: string;
  description: string | null;
  valueType: FeatureValueType;
  sortOrder: number;
}

/** Alta y edición de plan. `basePrice` va **sin** IVA. */
export interface SavePlanPayload {
  code: string;
  name: string;
  description?: string;
  planType: PlanType;
  basePrice: number;
  validityDays?: number;
  billingPeriod: BillingPeriod;
  postingQuota?: number;
  isPopular?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface SavePlanFeaturePayload {
  code: string;
  name: string;
  description?: string;
  valueType: FeatureValueType;
  sortOrder?: number;
}

export interface PlanFeatureValuePayload {
  featureCode: string;
  isIncluded: boolean;
  value?: string;
}
