import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

    <section class="bg-white px-6 py-20 lg:px-[60px] lg:py-[80px]">
      <div class="mx-auto max-w-[1180px]">
        <p class="mb-3 text-[15px] font-semibold text-accent-blue">Elige tu plan</p>
        <h2 class="text-[40px] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]">
          Ahorra hasta 10%
        </h2>

        <div class="mb-14 mt-9">
          <app-billing-toggle
            [options]="facade.billingOptions()"
            [activeOption]="billingCycle()"
            (cycleChange)="onCycleChange($event)"
          />
        </div>

        <app-plans-grid
          [plans]="facade.plans()"
          [billingCycle]="billingCycle()"
        />
      </div>
    </section>
  `,
})
export class PlansPage {
  protected readonly facade = inject(PlansFacade);
  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected onCycleChange(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }
}
