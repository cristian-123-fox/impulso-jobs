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
  PALETTE_HEX,
  SOFT_CLASSES,
} from '@/features/panel/panel.theme';

/** Dashboard del administrador: tendencia, distribución, empresas y categorías. */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-[18px]">
      <div class="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <!-- Área: postulaciones por mes -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-ink-900">Postulaciones por mes</h3>
              <p class="mt-1 text-[12.5px] text-muted">Últimos 12 meses en la plataforma</p>
            </div>
            <span class="rounded-lg bg-accent-green-soft px-2.5 py-1 text-xs font-bold text-accent-green">
              +18.4%
            </span>
          </div>
          <svg viewBox="0 0 640 220" width="100%" preserveAspectRatio="none" class="mt-2 block">
            <defs>
              <linearGradient id="panelAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="brand" stop-opacity="0.2" />
                <stop offset="100%" [attr.stop-color]="brand" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path [attr.d]="data.area.area" fill="url(#panelAreaGrad)" />
            <path
              [attr.d]="data.area.line"
              fill="none"
              [attr.stroke]="brand"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            @for (p of data.area.points; track $index) {
              <svg:circle
                [attr.cx]="p.cx"
                [attr.cy]="p.cy"
                r="3.5"
                fill="#fff"
                [attr.stroke]="brand"
                stroke-width="2.5"
              />
            }
          </svg>
          <div class="mt-1.5 flex justify-between px-1.5">
            @for (m of data.area.months; track $index) {
              <span class="text-[11px] font-medium text-muted">{{ m }}</span>
            }
          </div>
        </div>

        <!-- Donut: vacantes por estado -->
        <div class="flex flex-col rounded-2xl bg-white p-6 shadow-card">
          <h3 class="text-base font-bold text-ink-900">Vacantes por estado</h3>
          <div class="relative my-3.5 self-center">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="70" fill="none" stroke="#f1f0f7" stroke-width="22" />
              <g transform="rotate(-90 90 90)">
                @for (s of data.donut.segments; track $index) {
                  <svg:circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    [attr.stroke]="s.color"
                    stroke-width="22"
                    [attr.stroke-dasharray]="s.dash"
                    [attr.stroke-dashoffset]="s.offset"
                  />
                }
              </g>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[26px] font-extrabold text-ink-900">{{ data.donut.total }}</span>
              <span class="text-xs text-muted">Vacantes</span>
            </div>
          </div>
          <div class="mt-2 flex flex-col gap-2.5">
            @for (l of data.donut.legend; track l.label) {
              <div class="flex items-center gap-2.5 text-[13px]">
                <span class="h-2.5 w-2.5 rounded-[3px]" [style.background]="l.color"></span>
                <span class="text-body">{{ l.label }}</span>
                <span class="ml-auto font-bold text-ink-900">{{ l.value }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <!-- Empresas recientes -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-3.5 flex items-center justify-between">
            <h3 class="text-base font-bold text-ink-900">Empresas recientes</h3>
            <button
              type="button"
              class="text-[13px] font-semibold text-brand transition-colors hover:text-brand-600"
              (click)="navigate.emit('empresas')"
            >
              Ver todas
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-left">
                  @for (h of ['Empresa', 'Sector', 'Vacantes', 'Estado']; track h) {
                    <th class="pb-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                      {{ h }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (c of data.companies; track c.name) {
                  <tr class="border-t border-line">
                    <td class="py-3">
                      <div class="flex items-center gap-3">
                        <span
                          class="flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-bold"
                          [class]="soft(c.logo)"
                        >
                          {{ c.initials }}
                        </span>
                        <span class="text-sm font-semibold text-ink-900">{{ c.name }}</span>
                      </div>
                    </td>
                    <td class="py-3 text-[13.5px] text-body">{{ c.sector }}</td>
                    <td class="py-3 text-sm font-bold text-ink-900">{{ c.vacancies }}</td>
                    <td class="py-3">
                      <span
                        class="inline-block rounded-lg px-2.5 py-1 text-[11.5px] font-bold"
                        [class]="badge(c.statusKind)"
                      >
                        {{ c.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top categorías -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Top categorías</h3>
          <div class="flex flex-col gap-[15px]">
            @for (cat of data.categories; track cat.label) {
              <div>
                <div class="mb-1.5 flex justify-between text-[13px]">
                  <span class="font-semibold text-body">{{ cat.label }}</span>
                  <span class="font-bold text-ink-900">{{ cat.value }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-md bg-surface">
                  <div
                    class="h-full rounded-md"
                    [style.width.%]="cat.pct"
                    [style.background]="cat.color"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboard {
  readonly navigate = output<string>();
  protected readonly data = inject(PanelFacade).adminDashboard();
  protected readonly brand = PALETTE_HEX.brand;

  protected soft(kind: PanelColor): string {
    return SOFT_CLASSES[kind];
  }
  protected badge(kind: BadgeKind): string {
    return BADGE_CLASSES[kind];
  }
}
