import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  BillingCycle,
  BillingOption,
} from '@/features/public/plans/models/plans.models';

@Component({
  selector: 'app-billing-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex flex-wrap items-center gap-2 rounded-full bg-brand-50 p-1.5"
      role="tablist"
      aria-label="Cambiar ciclo de facturación"
    >
      @for (option of options(); track option.id) {
        <button
          type="button"
          role="tab"
          class="rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          [class.bg-brand]="activeOption() === option.id"
          [class.text-white]="activeOption() === option.id"
          [class.text-brand]="activeOption() !== option.id"
          [attr.aria-selected]="activeOption() === option.id"
          (click)="cycleChange.emit(option.id)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class BillingToggle {
  readonly options = input.required<readonly BillingOption[]>();
  readonly activeOption = input.required<BillingCycle>();
  readonly cycleChange = output<BillingCycle>();
}
