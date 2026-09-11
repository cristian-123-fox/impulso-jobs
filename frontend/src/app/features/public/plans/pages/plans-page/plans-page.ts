import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { BillingToggle } from '@/features/public/plans/components/billing-toggle/billing-toggle';
import { PlansGrid } from '@/features/public/plans/components/plans-grid/plans-grid';
import { PlansFacade } from '@/features/public/plans/data/plans.facade';
import { BillingCycle } from '@/features/public/plans/models/plans.models';
import { IjPageHeader } from '@/shared/ui';
import { SeoService } from '@/core/services/seo.service';

@Component({
  selector: 'app-plans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjPageHeader, BillingToggle, PlansGrid, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <ij-page-header
        [title]="t('plans.hero.title')"
        [lead]="t('plans.hero.description')"
        [breadcrumb]="t('plans.hero.breadcrumb')"
      />

      <section class="bg-white px-6 py-20 lg:px-[60px] lg:py-[80px]">
        <div class="mx-auto max-w-[1180px]">
          @if (facade.loading()) {
            <div class="grid gap-6 lg:grid-cols-3 lg:gap-[26px]">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-[420px] animate-pulse rounded-[12px] bg-surface"></div>
              }
            </div>
          } @else if (facade.hasError()) {
            <div class="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-red-700">
              {{ t('plans.error') }}
            </div>
          } @else if (facade.isEmpty()) {
            <div class="rounded-2xl bg-surface p-12 text-center">
              <h2 class="text-xl font-extrabold text-ink-900">
                {{ t('plans.empty.title') }}
              </h2>
              <p class="mx-auto mt-2 max-w-md text-[14px] text-muted">
                {{ t('plans.empty.body') }}
              </p>
            </div>
          } @else {
            <p class="mb-3 text-[15px] font-semibold text-brand-strong">
              {{ t('plans.eyebrow') }}
            </p>
            <h2 class="text-[40px] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]">
              {{ t('plans.title') }}
            </h2>

            @if (facade.billingOptions().length > 1) {
              <div class="mb-14 mt-9">
                <app-billing-toggle
                  [options]="facade.billingOptions()"
                  [activeOption]="billingCycle()"
                  (cycleChange)="onCycleChange($event)"
                />
              </div>
            } @else {
              <div class="mb-14"></div>
            }

            <app-plans-grid [plans]="plans()" [billingCycle]="billingCycle()" />

            <p class="mt-8 text-[13px] text-muted">{{ t('plans.taxNote') }}</p>
          }
        </div>
      </section>
    </ng-container>
  `,
})
export class PlansPage {
  protected readonly facade = inject(PlansFacade);
  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected readonly plans = computed(() =>
    this.facade.plansFor(this.billingCycle()),
  );

  constructor() {
    inject(SeoService).setLocalizedPage({
      titleKey: 'seo.plans.title',
      descriptionKey: 'seo.plans.description',
      canonicalPath: '/planes',
    });

    // Ruta renderizada en servidor: la API sólo se consulta en el navegador.
    afterNextRender(() => this.facade.load());

    // Si el ciclo activo se queda sin planes (p. ej. sólo hay anuales),
    // salta al primero disponible.
    effect(() => {
      const options = this.facade.billingOptions();
      if (options.length > 0 && !options.some((o) => o.id === this.billingCycle())) {
        this.billingCycle.set(options[0].id);
      }
    });
  }

  protected onCycleChange(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }
}
