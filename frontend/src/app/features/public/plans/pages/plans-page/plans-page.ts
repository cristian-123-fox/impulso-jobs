import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BillingToggle } from '@/features/public/plans/components/billing-toggle/billing-toggle';
import { PlansGrid } from '@/features/public/plans/components/plans-grid/plans-grid';
import { PlansHero } from '@/features/public/plans/components/plans-hero/plans-hero';
import { PlansFacade } from '@/features/public/plans/data/plans.facade';
import { BillingCycle } from '@/features/public/plans/models/plans.models';

@Component({
  selector: 'app-plans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlansHero, BillingToggle, PlansGrid],
  template: `
    <app-plans-hero [content]="facade.hero()" />

    <section class="px-6 py-20 lg:px-[60px] lg:py-24">
      <div class="mx-auto max-w-[1180px]">
        <div
          class="mb-12 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="max-w-3xl">
            <p class="mb-3 text-[15px] font-semibold text-accent-blue">
              Elige tu plan
            </p>
            <h2
              class="text-[40px] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]"
            >
              Ahorra hasta 10%
            </h2>
            <p class="mt-4 text-[15px] leading-7 text-body">
              Factura anual y obtén el mejor valor para equipos que publican vacantes
              con frecuencia.
            </p>
          </div>

          <div class="flex flex-col items-start gap-3">
            <app-billing-toggle
              [options]="facade.billingOptions()"
              [activeOption]="billingCycle()"
              (cycleChange)="onCycleChange($event)"
            />
            <p class="text-sm text-muted">
              Todos los planes incluyen soporte para gestionar vacantes y
              candidatos desde un solo lugar.
            </p>
          </div>
        </div>

        <app-plans-grid
          [plans]="facade.plans()"
          [billingCycle]="billingCycle()"
        />

        <div
          class="mt-10 rounded-[28px] bg-surface px-6 py-7 text-sm leading-7 text-body lg:px-8"
        >
          <p class="font-semibold text-ink-900">{{ billingSummary() }}</p>
          <p class="mt-1">
            Puedes empezar con el plan que necesites hoy y cambiarlo cuando tu
            volumen de contratación crezca.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class PlansPage {
  protected readonly facade = inject(PlansFacade);
  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected readonly billingSummary = computed(() =>
    this.billingCycle() === 'monthly'
      ? 'Facturación mensual para mantener máxima flexibilidad.'
      : 'Facturación anual con 10% de ahorro frente al pago mes a mes.',
  );

  protected onCycleChange(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }
}
