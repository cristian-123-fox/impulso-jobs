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
    <article
      class="relative overflow-hidden rounded-[12px] bg-white pb-9 shadow-[0_24px_54px_-30px_rgba(0,0,0,.28)]"
    >
      <div class="relative overflow-hidden">
        @if (plan().recommended) {
          <span
            class="absolute right-4 top-4 z-10 rounded-md bg-accent-green px-[14px] py-1.5 text-xs font-semibold text-white"
          >
            Recomendado
          </span>
        }

        <div class="relative h-[150px] overflow-hidden">
          <div [class]="decoClasses()"></div>
          <div class="absolute left-9 top-10 z-[1]">
            <h3 [class]="titleClasses()">{{ plan().name }}</h3>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-[40px] font-extrabold leading-none text-ink-900">
                {{ priceLabel() }}/
              </span>
              <span class="pb-1 text-[15px] font-semibold text-ink-900">
                {{ periodLabel() }}
              </span>
            </div>
          </div>
        </div>

        <div class="px-9 pt-6">
          <div class="mb-[30px] flex flex-col gap-4">
            @for (feature of plan().features; track feature.label) {
              <div class="flex items-center gap-3">
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  [class.text-brand]="feature.included"
                  [class.text-[#c0c4cf]]="!feature.included"
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
                  [class.text-[#a0a0b4]]="!feature.included"
                >
                  {{ feature.label }}
                </span>
              </div>
            }
          </div>

          <button ij-button type="button" variant="primary" shape="rounded" size="lg">
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
    this.billingCycle() === 'monthly' ? 'Mensual' : 'Anual',
  );

  protected readonly decoClasses = computed(() => {
    const accent =
      this.plan().accent === 'amber'
        ? 'bg-accent-amber-soft'
        : this.plan().accent === 'pink'
          ? 'bg-accent-pink-soft'
          : 'bg-brand-50';

    return [
      'absolute left-1/2 top-[-90px] h-[230px] w-[150%] -translate-x-1/2 rounded-b-[50%]',
      accent,
    ].join(' ');
  });

  protected readonly titleClasses = computed(() => {
    const accent =
      this.plan().accent === 'amber'
        ? 'text-accent-amber'
        : this.plan().accent === 'pink'
          ? 'text-accent-pink'
          : 'text-brand';

    return ['text-[20px] font-semibold', accent].join(' ');
  });
}
