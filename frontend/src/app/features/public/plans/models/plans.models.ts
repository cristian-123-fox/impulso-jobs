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
