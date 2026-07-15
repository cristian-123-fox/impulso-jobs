import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import { PromoTier } from '@/features/panel/models/panel.models';
import { PromoTierCard } from '@/features/panel/components/promo-tier-card/promo-tier-card';

/** Vista de empresa "Promociona tu vacante": aviso + tarifas con CTA de compra. */
@Component({
  selector: 'app-promo-buy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, PromoTierCard],
  template: `
    <div>
      <div class="mb-[18px] flex items-center gap-2.5 rounded-2xl bg-brand-50 px-[18px] py-3.5">
        <span class="flex-shrink-0 text-brand"><ij-icon name="flash" [size]="20" /></span>
        <span class="text-[13.5px] text-body">
          Elige un plan para
          <b class="font-bold text-ink-900">destacar una vacante durante 60 días</b>. Pago único ·
          precios en COP con IVA del 19% incluido.
        </span>
      </div>

      <div class="grid gap-[18px] lg:grid-cols-3">
        @for (p of tiers; track p.name) {
          <app-promo-tier-card [tier]="p">
            <button type="button" [class]="ctaClass(p)">
              {{ p.popular ? 'Comprar · Más popular' : 'Comprar plan' }}
            </button>
          </app-promo-tier-card>
        }
      </div>
    </div>
  `,
})
export class PromoBuy {
  protected readonly tiers = inject(PanelFacade).promoTiers();

  protected ctaClass(tier: PromoTier): string {
    const base =
      'mt-4 w-full rounded-[11px] py-2.5 text-[13.5px] font-bold transition-colors';
    return tier.popular
      ? `${base} bg-brand text-white hover:bg-brand-600`
      : `${base} bg-brand-50 text-brand hover:bg-brand hover:text-white`;
  }
}
