import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
    <div class="grid gap-6 lg:grid-cols-3 lg:gap-[26px]">
      @for (plan of plans(); track plan.id) {
        <ij-pricing-card [plan]="plan" [billingCycle]="billingCycle()" />
      }
    </div>
  `,
})
export class PlansGrid {
  readonly plans = input.required<readonly PricingPlan[]>();
  readonly billingCycle = input.required<BillingCycle>();
}
