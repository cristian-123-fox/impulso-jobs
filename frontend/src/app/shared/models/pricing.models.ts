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
  /**
   * Query params del CTA. Van aparte porque `routerLink` escapa el `?` de una
   * cadena: `'/empresa/promociones?plan=x'` navegaría a una ruta inexistente.
   */
  readonly ctaQueryParams?: Readonly<Record<string, string>>;
  /** Sustituye a "Comprar ahora" (p. ej. "Gestionar planes" para un admin). */
  readonly ctaLabel?: string;
  /** Botón visible pero inactivo: el plan no es para quien lo está viendo. */
  readonly ctaDisabled?: boolean;
}
