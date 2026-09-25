import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@/core/auth/auth.service';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { Role } from '@/core/models/role.enum';
import { PublicPlansApi } from '@/features/public/plans/data/public-plans.api';
import {
  ApiPlan,
  ApiPlanFeature,
  BillingCycle,
  BillingOption,
  PricingPlan,
} from '@/features/public/plans/models/plans.models';

const ACCENTS: readonly PricingPlan['accent'][] = ['amber', 'blue', 'pink'];

/** Los periodos reales del catálogo, proyectados al toggle de la vista. */
const CYCLE_BY_PERIOD: Record<string, BillingCycle> = {
  ONE_TIME: 'monthly',
  ANNUAL: 'annual',
};

/** Dónde compra una empresa: su panel de promociones, que lee `?plan=`. */
const COMPANY_PURCHASE_ROUTE = '/empresa/promociones';

type PlanCta = Pick<
  PricingPlan,
  'ctaLink' | 'ctaQueryParams' | 'ctaLabel' | 'ctaDisabled'
>;

/**
 * Facade del feature de planes. Los planes vienen de `GET /plans` (los que el
 * admin creó y activó en `/admin/planes`); aquí solo se proyectan a las cards.
 *
 * **Lo que la API devuelve no se traduce** (T26): el nombre del plan, su
 * descripción y el nombre de cada beneficio los escribe el back-office en un
 * solo idioma. Lo que sí se traduce es lo que arma el frontend alrededor: la
 * etiqueta del ciclo, el sufijo del precio y el "ilimitado" de un beneficio
 * numérico.
 */
@Injectable({ providedIn: 'root' })
export class PlansFacade {
  private readonly api = inject(PublicPlansApi);
  private readonly i18n = inject(AppTranslateService);
  private readonly auth = inject(AuthService);

  private readonly apiPlans = signal<ApiPlan[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal(false);

  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  /**
   * Sólo un indicador: el texto del error se resuelve en la vista. Guardarlo ya
   * traducido dejaría el aviso en el idioma que hubiera al fallar la llamada.
   */
  readonly hasError = this.errorState.asReadonly();

  /** Solo se ofrecen los ciclos que tienen al menos un plan publicado. */
  readonly billingOptions = computed<readonly BillingOption[]>(() => {
    const cycles = new Set(
      this.apiPlans()
        .map((plan) => CYCLE_BY_PERIOD[plan.billingPeriod])
        .filter(Boolean),
    );
    return (['monthly', 'annual'] as const)
      .filter((cycle) => cycles.has(cycle))
      .map((cycle) => ({
        id: cycle,
        label: this.i18n.t(`plans.cycles.${cycle}`),
      }));
  });

  readonly isEmpty = computed(
    () => this.loadedState() && this.apiPlans().length === 0,
  );

  load(): void {
    if (this.loadingState() || this.loadedState()) return;
    this.loadingState.set(true);
    this.errorState.set(false);
    this.api.list().subscribe({
      next: (plans) => {
        this.apiPlans.set(plans);
        this.loadedState.set(true);
        this.loadingState.set(false);
      },
      error: () => {
        this.errorState.set(true);
        this.loadingState.set(false);
      },
    });
  }

  /**
   * Las tarjetas de un ciclo. Traduce por dentro (`AppTranslateService`), así
   * que el `computed` que llame a este método queda enganchado al idioma y se
   * rearma al cambiarlo (T26).
   */
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
      periodLabel: this.i18n.t(`plans.periods.${cycle}`),
      ...this.ctaFor(plan),
      features: plan.features.map((feature) => this.toFeature(feature)),
    };
  }

  /**
   * El botón depende de quién mira, y lee la sesión: el `computed` que pinte
   * las tarjetas se rearma al iniciar o cerrar sesión.
   *
   * - **Empresa con sesión** → su panel, con el plan preseleccionado. Antes
   *   caía siempre en el registro, aunque la empresa ya tuviera cuenta.
   * - **Sin sesión** → el registro de empresa con `?plan=`, que lo pasa al
   *   login como `returnUrl`: quien ya tiene cuenta entra y aterriza en el
   *   formulario de compra. En SSR no hay sesión, así que éste es también el
   *   HTML que sirve el servidor; el cliente lo corrige al hidratar.
   * - **Administrador** → el back-office de planes.
   * - **Aspirante** → botón inactivo: los planes son de empresa.
   */
  private ctaFor(plan: ApiPlan): PlanCta {
    switch (this.auth.currentUser()?.role) {
      case Role.EMPLOYER:
        return {
          ctaLink: COMPANY_PURCHASE_ROUTE,
          ctaQueryParams: { plan: plan.id },
        };
      case Role.ADMIN:
        return {
          ctaLink: '/admin/planes',
          ctaLabel: this.i18n.t('plans.cta.manage'),
        };
      case Role.CANDIDATE:
        return {
          ctaDisabled: true,
          ctaLabel: this.i18n.t('plans.cta.companiesOnly'),
        };
      default:
        return {
          ctaLink: '/auth/registro/empresa',
          ctaQueryParams: { plan: plan.id },
        };
    }
  }

  private toFeature(feature: ApiPlanFeature): { label: string; included: boolean } {
    let label = feature.name;
    if (feature.valueType === 'NUMERIC' && feature.isIncluded && feature.value) {
      label =
        feature.value === '-1'
          ? this.i18n.t('plans.features.unlimited', { name: feature.name })
          : this.i18n.t('plans.features.value', {
              name: feature.name,
              value: feature.value,
            });
    }
    return { label, included: feature.isIncluded };
  }
}
