import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { PromoTier } from '@/features/panel/models/panel.models';

/**
 * Tarjeta de plan de promoción (Essential/Pro/Premium). Presentacional: el pie
 * (contador + editar, o CTA de compra) se proyecta con `<ng-content>`.
 */
@Component({
  selector: 'app-promo-tier-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div [class]="cardClass()">
      <div class="flex items-center justify-between">
        <span class="text-base font-extrabold" [class]="nameClass()">{{ tier().name }}</span>
        @if (tier().popular) {
          <span class="rounded-full bg-brand px-2.5 py-0.5 text-[10.5px] font-bold text-white">
            Más popular
          </span>
        }
      </div>
      <div class="mt-3 flex items-baseline gap-1.5">
        <span class="text-xs font-semibold text-muted">desde</span>
        <span class="text-[26px] font-extrabold text-ink-900">{{ tier().price }}</span>
      </div>
      <p class="mb-0.5 mt-1 text-xs text-muted">{{ tier().priceNote }}</p>
      <p class="mb-3.5 text-[12.5px] font-semibold text-brand">{{ tier().duration }}</p>
      <div class="flex flex-col gap-2.5">
        @for (f of tier().features; track f) {
          <div class="flex items-center gap-2.5 text-[12.5px] text-body">
            <span [class]="tier().popular ? 'inline-flex text-brand' : 'inline-flex text-accent-green'">
              <ij-icon name="check" [size]="15" [strokeWidth]="2.6" />
            </span>
            {{ f }}
          </div>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class PromoTierCard {
  readonly tier = input.required<PromoTier>();

  protected cardClass(): string {
    const base = 'flex flex-col rounded-2xl bg-white p-[22px]';
    return this.tier().popular
      ? `${base} border-[1.5px] border-brand shadow-float`
      : `${base} border border-transparent shadow-card`;
  }

  protected nameClass(): string {
    if (this.tier().popular) return 'text-brand';
    return this.tier().name === 'Premium' ? 'text-[#9a6f1e]' : 'text-ink-900';
  }
}
