import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { PlansApi } from '@/features/admin/plans/data/plans.api';
import {
  Plan,
  PlanFeatureCatalogItem,
  PlanFeatureValuePayload,
  PlanType,
  SavePlanFeaturePayload,
  SavePlanPayload,
} from '@/features/admin/plans/models/plans.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Fachada del back-office de planes. El listado del backend no está paginado
 * (el catálogo es corto), así que se cachea entero y las acciones reemplazan la
 * fila afectada con lo que devuelve la API.
 */
@Injectable()
export class PlansFacade {
  private readonly api = inject(PlansApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly plans = signal<Plan[]>([]);
  readonly features = signal<PlanFeatureCatalogItem[]>([]);
  readonly state = signal<LoadState>('idle');
  readonly featuresState = signal<LoadState>('idle');

  readonly stats = computed(() => {
    const list = this.plans();
    return {
      total: list.length,
      active: list.filter((plan) => plan.isActive).length,
      perPublication: list.filter(
        (plan) => plan.planType === PlanType.PER_PUBLICATION,
      ).length,
      subscription: list.filter(
        (plan) => plan.planType === PlanType.ANNUAL_SUBSCRIPTION,
      ).length,
    };
  });

  load(): void {
    this.state.set('loading');
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => {
          this.plans.set(this.sorted(plans));
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  /** El catálogo de beneficios cambia poco: se pide una sola vez. */
  loadFeatures(): void {
    if (this.featuresState() === 'loading' || this.features().length > 0) return;
    this.featuresState.set('loading');
    this.api
      .listFeatures()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (features) => {
          this.features.set(features);
          this.featuresState.set('loaded');
        },
        error: () => this.featuresState.set('error'),
      });
  }

  create(payload: SavePlanPayload): Observable<Plan> {
    return this.api.create(payload).pipe(tap((plan) => this.upsert(plan)));
  }

  update(id: string, payload: SavePlanPayload): Observable<Plan> {
    return this.api.update(id, payload).pipe(tap((plan) => this.upsert(plan)));
  }

  changeStatus(id: string, isActive: boolean): Observable<Plan> {
    return this.api
      .changeStatus(id, isActive)
      .pipe(tap((plan) => this.upsert(plan)));
  }

  setFeatures(
    id: string,
    features: PlanFeatureValuePayload[],
  ): Observable<Plan> {
    return this.api
      .setFeatures(id, features)
      .pipe(tap((plan) => this.upsert(plan)));
  }

  /**
   * Alta o edición de un beneficio del catálogo. Al guardar se recargan los
   * planes: su matriz incluye el catálogo completo, así que un beneficio nuevo
   * debe aparecer en todos.
   */
  saveFeature(
    payload: SavePlanFeaturePayload,
  ): Observable<PlanFeatureCatalogItem> {
    return this.api.saveFeature(payload).pipe(
      tap((feature) => {
        this.features.update((list) => {
          const index = list.findIndex((item) => item.code === feature.code);
          const next =
            index === -1
              ? [...list, feature]
              : list.map((item) => (item.code === feature.code ? feature : item));
          return [...next].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          );
        });
        this.load();
      }),
    );
  }

  private upsert(plan: Plan): void {
    this.plans.update((list) => {
      const index = list.findIndex((item) => item.id === plan.id);
      const next =
        index === -1
          ? [...list, plan]
          : list.map((item) => (item.id === plan.id ? plan : item));
      return this.sorted(next);
    });
  }

  /** Mismo orden que verá el visitante en /planes. */
  private sorted(plans: Plan[]): Plan[] {
    return [...plans].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }
}
