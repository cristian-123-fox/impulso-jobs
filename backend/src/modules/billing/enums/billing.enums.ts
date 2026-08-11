/** Modelo de cobro del plan. */
export enum PlanType {
  /** Media / Alta: pago único que promociona **una** vacante. */
  PER_PUBLICATION = 'PER_PUBLICATION',
  /** Anual: suscripción de la **empresa**, no de una vacante. */
  ANNUAL_SUBSCRIPTION = 'ANNUAL_SUBSCRIPTION',
}

export enum BillingPeriod {
  ONE_TIME = 'ONE_TIME',
  ANNUAL = 'ANNUAL',
}

/** Cómo se interpreta `plan_feature_values.value`. */
export enum FeatureValueType {
  BOOLEAN = 'BOOLEAN',
  NUMERIC = 'NUMERIC',
  PERCENT = 'PERCENT',
  TEXT = 'TEXT',
}

export enum PromotionStatus {
  /** Creada, esperando el pago. No aplica beneficios todavía. */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  OXXO = 'OXXO',
  SPEI = 'SPEI',
  /** Meses sin intereses (tarjeta a plazos). */
  MSI = 'MSI',
}

export enum PaymentStatus {
  /** Orden creada, aún no se envió al proveedor. */
  PENDING = 'PENDING',
  /** El proveedor aceptó pero el cobro es asíncrono (OXXO / SPEI). */
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Códigos de beneficio del catálogo (`Impulso_Jobs_Planes_Suscripciones.md` §4).
 * El **valor** de cada uno por plan lo define un administrador; aquí sólo
 * viven los códigos a los que se refiere la lógica de negocio.
 */
export enum PlanFeatureCode {
  VERIFIED_PUBLICATION = 'verified_publication',
  SCREENING_QUESTIONS = 'screening_questions',
  AUTO_REJECTION_MESSAGE = 'auto_rejection_message',
  APPLICANT_CONTACT_DATA = 'applicant_contact_data',
  FEATURED_RANKING = 'featured_ranking',
  URGENT_CONFIDENTIAL_BADGE = 'urgent_confidential_badge',
  SOCIAL_MEDIA_DISTRIBUTION = 'social_media_distribution',
  TALENT_DB_ACCESS = 'talent_db_access',
  AI_CANDIDATE_MATCHING = 'ai_candidate_matching',
  AI_JOB_CREATION = 'ai_job_creation',
  PAUSE_REACTIVATE = 'pause_reactivate',
  EDIT_TITLE_ON_REACTIVATE = 'edit_title_on_reactivate',
  PUBLICATION_DAYS = 'publication_days',
}

/** IVA mexicano. Se guarda por plan (`tax_rate`) por si cambia la tasa. */
export const MX_TAX_RATE = 0.16;

/** Toda la monetización opera en pesos mexicanos. */
export const BILLING_CURRENCY = 'MXN';

/**
 * Límites de OXXO (Stripe México): pago único, entre $10 y $10,000 MXN. Por eso
 * el plan Alta no podrá pagarse en OXXO si su precio supera el techo.
 */
export const OXXO_MIN_AMOUNT = 10;
export const OXXO_MAX_AMOUNT = 10_000;
