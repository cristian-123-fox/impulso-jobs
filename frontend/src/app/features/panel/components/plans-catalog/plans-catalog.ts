import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import { PromoTierCard } from '@/features/panel/components/promo-tier-card/promo-tier-card';

/** Vista de administración "Planes y beneficios": tarifas + comparativa. */
@Component({
  selector: 'app-plans-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, PromoTierCard],
  template: `
    <div class="flex flex-col gap-[18px]">
      <div class="grid gap-[18px] lg:grid-cols-3">
        @for (p of tiers; track p.name) {
          <app-promo-tier-card [tier]="p">
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3.5">
              <span class="text-[12.5px] text-muted">
                <span class="text-[17px] font-extrabold text-ink-900">{{ p.count }}</span> activas
              </span>
              <button
                type="button"
                class="rounded-[9px] border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-brand transition-colors hover:bg-surface"
              >
                Editar
              </button>
            </div>
          </app-promo-tier-card>
        }
      </div>

      <div class="overflow-x-auto rounded-2xl bg-white p-6 shadow-card">
        <h3 class="mb-4 text-base font-bold text-ink-900">Comparativa de beneficios</h3>
        <table class="w-full min-w-[560px] border-collapse">
          <thead>
            <tr>
              <th class="pb-3 pr-3 text-left text-[11.5px] font-bold uppercase tracking-wide text-muted">
                Beneficio
              </th>
              <th class="px-2 pb-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                Essential
              </th>
              <th class="px-2 pb-3 text-[11.5px] font-bold uppercase tracking-wide text-brand">Pro</th>
              <th class="px-2 pb-3 text-[11.5px] font-bold uppercase tracking-wide text-[#9a6f1e]">
                Premium
              </th>
            </tr>
          </thead>
          <tbody>
            @for (r of matrix; track r.label) {
              <tr class="border-t border-line">
                <td class="py-3.5 pr-3 text-[13.5px] font-semibold text-body">{{ r.label }}</td>
                @for (c of r.cells; track $index) {
                  <td class="px-2 py-3.5 text-center">
                    @switch (c.kind) {
                      @case ('check') {
                        <span class="inline-flex text-accent-green">
                          <ij-icon name="check" [size]="17" [strokeWidth]="2.6" />
                        </span>
                      }
                      @case ('dash') {
                        <span class="font-bold text-line">—</span>
                      }
                      @default {
                        <span class="text-[13.5px] font-bold text-ink-900">{{ c.text }}</span>
                      }
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class PlansCatalog {
  private readonly facade = inject(PanelFacade);
  protected readonly tiers = this.facade.promoTiers();
  protected readonly matrix = this.facade.benefitMatrix();
}
