import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IjButton } from '@/shared/ui/button/button';
import { IjIcon } from '@/shared/ui/icon/icon';
import {
  BillingCycle,
  PricingPlan,
} from '@/shared/models/pricing.models';

const PRICE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'ij-pricing-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton],
  template: `
    <article class="overflow-hidden rounded-xl bg-white shadow-float">
      <div class="relative overflow-hidden px-7 pb-7 pt-0">
        @if (plan().recommended) {
          <span
            class="absolute right-5 top-5 z-10 rounded-md bg-accent-green px-3 py-1.5 text-xs font-semibold text-white"
          >
            Recomendado
          </span>
        }

        <div class="relative h-[158px] overflow-hidden">
          <div [class]="decoClasses()"></div>

          <div class="relative z-[1] px-2 pt-10">
            <p class="text-sm font-medium text-body">{{ plan().summary }}</p>
            <h3 [class]="titleClasses()">{{ plan().name }}</h3>

            <div class="mt-3 flex items-end gap-2">
              <span
                class="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-ink-900"
              >
                {{ priceLabel() }}
              </span>
              <span class="pb-1 text-sm font-semibold text-ink-900">
                / {{ periodLabel() }}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-4">
          <div class="mb-8 flex flex-col gap-4">
            @for (feature of plan().features; track feature.label) {
              <div class="flex items-start gap-3">
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  [class.text-accent-blue]="feature.included"
                  [class.text-muted]="!feature.included"
                >
                  <ij-icon
                    [name]="feature.included ? 'check' : 'x'"
                    [size]="16"
                    [strokeWidth]="3"
                  />
                </span>
                <span
                  class="text-[15px] font-medium leading-6"
                  [class.text-ink-900]="feature.included"
                  [class.text-muted]="!feature.included"
                >
                  {{ feature.label }}
                </span>
              </div>
            }
          </div>

          <button ij-button type="button" shape="rounded" size="lg">
            Comprar ahora
          </button>
        </div>
      </div>
    </article>
  `,
})
export class IjPricingCard {
  readonly plan = input.required<PricingPlan>();
  readonly billingCycle = input.required<BillingCycle>();

  protected readonly priceLabel = computed(() =>
    PRICE_FORMATTER.format(
      this.billingCycle() === 'monthly'
        ? this.plan().monthlyPrice
        : this.plan().annualPrice,
    ),
  );

  protected readonly periodLabel = computed(() =>
    this.billingCycle() === 'monthly' ? 'mes' : 'año',
  );

  protected readonly decoClasses = computed(() => {
    const accent =
      this.plan().accent === 'blue'
        ? 'bg-accent-blue-soft'
        : this.plan().accent === 'amber'
          ? 'bg-accent-amber-soft'
          : 'bg-accent-pink-soft';

    return [
      'absolute inset-x-[-25%] -top-[92px] h-[230px] rounded-b-[50%]',
      accent,
    ].join(' ');
  });

  protected readonly titleClasses = computed(() => {
    const accent =
      this.plan().accent === 'blue'
        ? 'text-accent-blue'
        : this.plan().accent === 'amber'
          ? 'text-accent-amber'
          : 'text-accent-pink';

    return ['mt-3 text-[22px] font-semibold', accent].join(' ');
  });
}
