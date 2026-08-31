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
  /** Sufijo del precio (p. ej. "Por publicación"); si falta, Mensual/Anual. */
  readonly periodLabel?: string;
  /** Destino del CTA "Comprar ahora"; sin él, el botón no navega. */
  readonly ctaLink?: string;
}
