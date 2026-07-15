import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import {
  BadgeKind,
  PanelColor,
} from '@/features/panel/models/panel.models';
import {
  BADGE_CLASSES,
  matchBarColor,
  matchTextClass,
  SOFT_CLASSES,
} from '@/features/panel/panel.theme';

/** Dashboard de empresa: embudo, postulaciones por vacante y candidatos. */
@Component({
  selector: 'app-empresa-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-[18px]">
      <div class="grid gap-[18px] xl:grid-cols-2">
        <!-- Embudo -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="text-base font-bold text-ink-900">Embudo de selección</h3>
          <p class="mb-[18px] mt-1 text-[12.5px] text-muted">
            Candidatos por etapa · todas las vacantes
          </p>
          <div class="flex flex-col gap-[13px]">
            @for (f of data.funnel; track f.label) {
              <div>
                <div class="mb-1.5 flex justify-between text-[13px]">
                  <span class="font-semibold text-body">{{ f.label }}</span>
                  <span class="text-muted">{{ f.count }} · {{ f.conv }}</span>
                </div>
                <div class="h-[26px] overflow-hidden rounded-lg bg-surface">
                  <div
                    class="h-full rounded-lg"
                    [style.width.%]="f.pct"
                    [style.background]="f.color"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Postulaciones por vacante -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="text-base font-bold text-ink-900">Postulaciones por vacante</h3>
          <p class="mb-[18px] mt-1 text-[12.5px] text-muted">Vacantes activas</p>
          <div class="flex h-[190px] items-end gap-3.5 pt-2.5">
            @for (b of data.vacancyBars; track b.label) {
              <div class="flex h-full flex-1 flex-col items-center justify-end gap-2.5">
                <span class="text-[12.5px] font-bold text-ink-900">{{ b.value }}</span>
                <div class="flex h-full w-full max-w-[38px] items-end overflow-hidden rounded-t-lg bg-surface">
                  <div
                    class="w-full rounded-t-lg"
                    [style.height.%]="b.pct"
                    [style.background]="b.color"
                  ></div>
                </div>
                <span class="text-[11.5px] font-semibold text-muted">{{ b.label }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Candidatos recientes -->
      <div class="rounded-2xl bg-white p-6 shadow-card">
        <div class="mb-3.5 flex items-center justify-between">
          <h3 class="text-base font-bold text-ink-900">Candidatos recientes</h3>
          <button
            type="button"
            class="text-[13px] font-semibold text-brand transition-colors hover:text-brand-600"
            (click)="navigate.emit('postulaciones')"
          >
            Ver postulaciones
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="text-left">
                @for (h of ['Candidato', 'Vacante', 'Match', 'Etapa', 'Fecha']; track h) {
                  <th class="pb-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                    {{ h }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (c of data.candidates; track c.name) {
                <tr class="border-t border-line">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                      <span
                        class="flex h-9 w-9 items-center justify-center rounded-full text-[12.5px] font-bold"
                        [class]="soft(c.avatar)"
                      >
                        {{ c.initials }}
                      </span>
                      <div>
                        <div class="whitespace-nowrap text-sm font-semibold text-ink-900">
                          {{ c.name }}
                        </div>
                        <div class="text-xs text-muted">{{ c.location }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 pr-4 text-[13.5px] text-body">{{ c.role }}</td>
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-[52px] overflow-hidden rounded bg-surface">
                        <div
                          class="h-full rounded"
                          [style.width.%]="c.match"
                          [style.background]="matchColor(c.match)"
                        ></div>
                      </div>
                      <span class="text-[13px] font-bold" [class]="matchText(c.match)">
                        {{ c.match }}%
                      </span>
                    </div>
                  </td>
                  <td class="py-3 pr-4">
                    <span
                      class="inline-block rounded-lg px-2.5 py-1 text-[11.5px] font-bold"
                      [class]="badge(c.stageKind)"
                    >
                      {{ c.stage }}
                    </span>
                  </td>
                  <td class="py-3 text-[13px] text-muted">{{ c.date }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class EmpresaDashboard {
  readonly navigate = output<string>();
  protected readonly data = inject(PanelFacade).empresaDashboard();

  protected soft(kind: PanelColor): string {
    return SOFT_CLASSES[kind];
  }
  protected badge(kind: BadgeKind): string {
    return BADGE_CLASSES[kind];
  }
  protected matchColor(pct: number): string {
    return matchBarColor(pct);
  }
  protected matchText(pct: number): string {
    return matchTextClass(pct);
  }
}
