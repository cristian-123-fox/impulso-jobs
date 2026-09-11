import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { IjButton } from '@/shared/ui/button/button';
import { IjIcon } from '@/shared/ui/icon/icon';
import {
  BillingCycle,
  PricingPlan,
} from '@/shared/models/pricing.models';

@Component({
  selector: 'ij-pricing-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, RouterLink, TranslocoDirective],
  template: `
    <article
      *transloco="let t"
      class="relative overflow-hidden rounded-[12px] bg-white pb-9 shadow-[0_24px_54px_-30px_rgba(0,0,0,.28)]"
    >
      <div class="relative overflow-hidden">
        @if (plan().recommended) {
          <span
            class="absolute right-4 top-4 z-10 rounded-md bg-accent-green-strong px-[14px] py-1.5 text-xs font-semibold text-white"
          >
            {{ t('pricing.recommended') }}
          </span>
        }

        <div class="relative h-[150px] overflow-hidden">
          <div [class]="decoClasses()"></div>
          <div class="absolute left-9 top-10 z-[1]">
            <h3 [class]="titleClasses()">{{ plan().name }}</h3>
            <div class="mt-2">
              <span class="text-[40px] font-extrabold leading-none text-ink-900">
                {{ priceLabel() }}
              </span>
              <span class="mt-1 block text-[13px] font-medium text-muted">
                {{ periodLabel() }}
              </span>
            </div>
          </div>
        </div>

        <div class="px-9 pt-6">
          @if (plan().summary) {
            <div class="mb-5 flex flex-col gap-1.5">
              @for (line of plan().summary.split('\n'); track $index) {
                @if (line.trim()) {
                  <div class="flex items-start gap-2">
                    <ij-icon name="check" [size]="14" [strokeWidth]="3" class="mt-0.5 shrink-0 text-brand-strong" />
                    <span class="text-[14px] leading-5 text-muted">{{ line.trim() }}</span>
                  </div>
                }
              }
            </div>
          }
          <div class="mb-[30px] flex flex-col gap-4">
            @for (feature of plan().features; track feature.label) {
              <div class="flex items-center gap-3">
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  [class.text-brand-strong]="feature.included"
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

          @if (plan().ctaLink; as ctaLink) {
            <a ij-button [routerLink]="ctaLink" variant="primary" shape="rounded" size="lg">
              {{ t('pricing.buy') }}
            </a>
          } @else {
            <button ij-button type="button" variant="primary" shape="rounded" size="lg">
              {{ t('pricing.buy') }}
            </button>
          }
        </div>
      </div>
    </article>
  `,
})
export class IjPricingCard {
  readonly plan = input.required<PricingPlan>();
  readonly billingCycle = input.required<BillingCycle>();

  private readonly format = inject(LocaleFormatService);
  private readonly i18n = inject(AppTranslateService);

  /** El importe se formatea con el locale activo (T26 §6), no con `es-MX` fijo. */
  protected readonly priceLabel = computed(() =>
    this.format.currency(
      this.billingCycle() === 'monthly'
        ? this.plan().monthlyPrice
        : this.plan().annualPrice,
    ),
  );

  protected readonly periodLabel = computed(
    () =>
      this.plan().periodLabel ??
      this.i18n.t(
        this.billingCycle() === 'monthly' ? 'pricing.monthly' : 'pricing.annual',
      ),
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
        ? 'text-accent-amber-strong'
        : this.plan().accent === 'pink'
          ? 'text-accent-pink-strong'
          : 'text-brand-strong';

    return ['text-[20px] font-semibold', accent].join(' ');
  });
}
