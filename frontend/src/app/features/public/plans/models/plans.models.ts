import type {
  BillingCycle,
  PricingFeature,
  PricingPlan,
} from '@/shared/models/pricing.models';

export type { BillingCycle, PricingFeature, PricingPlan };

export interface PlansHeroContent {
  readonly title: string;
  readonly breadcrumbLabel: string;
  readonly description: string;
}

export interface BillingOption {
  readonly id: BillingCycle;
  readonly label: string;
}

/** Tipos de `GET /plans` (público, sin auth), derivados del Swagger. */
export interface ApiPlanFeature {
  code: string;
  name: string;
  valueType: string;
  isIncluded: boolean;
  value: string | null;
}

export interface ApiPlanPrice {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export interface ApiPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** PER_PUBLICATION | ANNUAL_SUBSCRIPTION */
  planType: string;
  /** ONE_TIME | ANNUAL */
  billingPeriod: string;
  validityDays: number | null;
  postingQuota: number | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  price: ApiPlanPrice;
  features: ApiPlanFeature[];
}
