import { Injectable, computed, inject, signal } from '@angular/core';
import { PublicPlansApi } from '@/features/public/plans/data/public-plans.api';
import {
  ApiPlan,
  ApiPlanFeature,
  BillingCycle,
  BillingOption,
  PlansHeroContent,
  PricingPlan,
} from '@/features/public/plans/models/plans.models';

const ACCENTS: readonly PricingPlan['accent'][] = ['amber', 'blue', 'pink'];

/** Los periodos reales del catálogo, proyectados al toggle de la vista. */
const CYCLE_BY_PERIOD: Record<string, BillingCycle> = {
  ONE_TIME: 'monthly',
  ANNUAL: 'annual',
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Por publicación',
  annual: 'Suscripción anual',
};

const PERIOD_LABELS: Record<BillingCycle, string> = {
  monthly: 'Por publicación',
  annual: 'Anual',
};

/**
 * Facade del feature de planes. Los planes vienen de `GET /plans` (los que el
 * admin creó y activó en `/admin/planes`); aquí solo se proyectan a las cards.
 */
@Injectable({ providedIn: 'root' })
export class PlansFacade {
  private readonly api = inject(PublicPlansApi);

  private readonly _hero = signal<PlansHeroContent>({
    title: 'Planes y precios',
    breadcrumbLabel: 'Planes',
    description:
      'Escoge el plan que mejor se ajusta al ritmo de contratación de tu empresa y activa tus vacantes en minutos.',
  });

  private readonly apiPlans = signal<ApiPlan[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly hero = this._hero.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Solo se ofrecen los ciclos que tienen al menos un plan publicado. */
  readonly billingOptions = computed<readonly BillingOption[]>(() => {
    const cycles = new Set(
      this.apiPlans()
        .map((plan) => CYCLE_BY_PERIOD[plan.billingPeriod])
        .filter(Boolean),
    );
    return (['monthly', 'annual'] as const)
      .filter((cycle) => cycles.has(cycle))
      .map((cycle) => ({ id: cycle, label: CYCLE_LABELS[cycle] }));
  });

  readonly isEmpty = computed(
    () => this.loadedState() && this.apiPlans().length === 0,
  );

  load(): void {
    if (this.loadingState() || this.loadedState()) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    this.api.list().subscribe({
      next: (plans) => {
        this.apiPlans.set(plans);
        this.loadedState.set(true);
        this.loadingState.set(false);
      },
      error: () => {
        this.errorState.set(
          'No pudimos cargar los planes en este momento. Intenta de nuevo más tarde.',
        );
        this.loadingState.set(false);
      },
    });
  }

  plansFor(cycle: BillingCycle): readonly PricingPlan[] {
    return this.apiPlans()
      .filter((plan) => CYCLE_BY_PERIOD[plan.billingPeriod] === cycle)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((plan, index) => this.toPricingPlan(plan, cycle, index));
  }

  private toPricingPlan(
    plan: ApiPlan,
    cycle: BillingCycle,
    index: number,
  ): PricingPlan {
    return {
      id: plan.id,
      name: plan.name,
      summary: plan.description ?? '',
      monthlyPrice: plan.price.total,
      annualPrice: plan.price.total,
      recommended: plan.isPopular,
      accent: plan.isPopular ? 'amber' : ACCENTS[index % ACCENTS.length],
      periodLabel: PERIOD_LABELS[cycle],
      ctaLink: '/auth/registro/empresa',
      features: plan.features.map((feature) => this.toFeature(feature)),
    };
  }

  private toFeature(feature: ApiPlanFeature): { label: string; included: boolean } {
    let label = feature.name;
    if (feature.valueType === 'NUMERIC' && feature.isIncluded && feature.value) {
      label =
        feature.value === '-1'
          ? `${feature.name}: ilimitado`
          : `${feature.name}: ${feature.value}`;
    }
    return { label, included: feature.isIncluded };
  }
}
