import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IjPricingCard } from '@/shared/ui';
import {
  BillingCycle,
  PricingPlan,
} from '@/features/public/plans/models/plans.models';

@Component({
  selector: 'app-plans-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjPricingCard],
  template: `
    <div [class]="gridClass()">
      @for (plan of plans(); track plan.id) {
        <ij-pricing-card [plan]="plan" [billingCycle]="billingCycle()" />
      }
    </div>
  `,
})
export class PlansGrid {
  readonly plans = input.required<readonly PricingPlan[]>();
  readonly billingCycle = input.required<BillingCycle>();

  /**
   * Tantas columnas como planes haya, hasta tres. Con `lg:grid-cols-3` fijas y
   * un único plan publicado, la tarjeta quedaba sola a la izquierda y dos
   * tercios de la sección en blanco.
   */
  protected readonly gridClass = computed(() => {
    const base = 'grid gap-6 lg:gap-[26px]';
    switch (Math.min(this.plans().length, 3)) {
      case 1:
        return `${base} mx-auto max-w-[420px]`;
      case 2:
        return `${base} mx-auto max-w-[860px] sm:grid-cols-2`;
      default:
        return `${base} sm:grid-cols-2 lg:grid-cols-3`;
    }
  });
}
