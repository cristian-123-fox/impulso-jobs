export type BillingCycle = 'monthly' | 'annual';

export interface PricingFeature {
  readonly label: string;
  readonly included: boolean;
}

export interface PricingPlan {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly monthlyPrice: number;
  readonly annualPrice: number;
  readonly recommended: boolean;
  readonly accent: 'blue' | 'amber' | 'pink';
  readonly features: readonly PricingFeature[];
}
