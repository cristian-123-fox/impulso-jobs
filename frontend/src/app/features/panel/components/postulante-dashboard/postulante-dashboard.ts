import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { IjIcon } from '@/shared/ui';
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

/** Dashboard del aspirante: empleos recomendados, perfil y postulaciones. */
@Component({
  selector: 'app-postulante-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="flex flex-col gap-[18px]">
      <div class="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <!-- Empleos recomendados -->
        <div class="rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-base font-bold text-ink-900">Empleos recomendados</h3>
            <button
              type="button"
              class="text-[13px] font-semibold text-brand transition-colors hover:text-brand-600"
              (click)="navigate.emit('buscar')"
            >
              Ver todos
            </button>
          </div>
          <div class="flex flex-col gap-3">
            @for (j of data.jobs; track j.title) {
              <div
                class="flex items-start gap-3.5 rounded-2xl border border-line p-4 transition-colors hover:border-brand/30 hover:bg-surface"
              >
                <span
                  class="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl text-[15px] font-bold"
                  [class]="soft(j.logo)"
                >
                  {{ j.initials }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2.5">
                    <span class="text-[15px] font-bold text-ink-900">{{ j.title }}</span>
                    <span
                      class="whitespace-nowrap rounded-md bg-accent-green-soft px-2.5 py-1 text-[11.5px] font-bold text-accent-green"
                    >
                      {{ j.match }} match
                    </span>
                  </div>
                  <div class="mt-0.5 text-[13px] text-muted">{{ j.company }} · {{ j.location }}</div>
                  <div class="mt-2.5 flex flex-wrap items-center gap-2">
                    @for (t of j.tags; track t) {
                      <span class="rounded-md bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-body">
                        {{ t }}
                      </span>
                    }
                    <span class="ml-auto text-[13px] font-bold text-brand">{{ j.salary }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Perfil -->
        <div class="flex flex-col rounded-2xl bg-white p-6 shadow-card">
          <h3 class="text-base font-bold text-ink-900">Tu perfil</h3>
          <div class="relative my-3 self-center">
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx="75" cy="75" r="60" fill="none" stroke="#f1f0f7" stroke-width="14" />
              <circle
                cx="75"
                cy="75"
                r="60"
                fill="none"
                [attr.stroke]="brand"
                stroke-width="14"
                stroke-linecap="round"
                [attr.stroke-dasharray]="data.ringDash"
                transform="rotate(-90 75 75)"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[28px] font-extrabold text-ink-900">{{ data.profilePct }}%</span>
              <span class="text-[11.5px] text-muted">completado</span>
            </div>
          </div>
          <div class="mt-1.5 flex flex-col gap-[11px]">
            @for (t of data.tasks; track t.label) {
              <div class="flex items-center gap-3 text-[13.5px]">
                <span
                  class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
                  [class]="t.done ? 'bg-accent-green text-white' : 'border-[1.5px] border-line bg-surface'"
                >
                  @if (t.done) {
                    <ij-icon name="check" [size]="12" [strokeWidth]="3" />
                  }
                </span>
                <span [class]="t.done ? 'font-medium text-body' : 'font-medium text-muted'">
                  {{ t.label }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Estado de postulaciones -->
      <div class="rounded-2xl bg-white p-6 shadow-card">
        <h3 class="mb-[18px] text-base font-bold text-ink-900">Estado de mis postulaciones</h3>
        <div class="flex flex-col gap-3.5">
          @for (a of data.applications; track a.title) {
            <div class="rounded-2xl border border-line p-4">
              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  [class]="soft(a.logo)"
                >
                  {{ a.initials }}
                </span>
                <div class="min-w-0">
                  <div class="text-[14.5px] font-bold text-ink-900">{{ a.title }}</div>
                  <div class="text-[12.5px] text-muted">{{ a.company }} · postulado {{ a.date }}</div>
                </div>
                <span
                  class="ml-auto inline-block rounded-lg px-3 py-1.5 text-[11.5px] font-bold"
                  [class]="badge(a.stageKind)"
                >
                  {{ a.stageLabel }}
                </span>
              </div>

              <div class="mt-4 flex items-center">
                @for (s of a.steps; track s.label; let i = $index; let last = $last) {
                  <div class="flex flex-1 items-center">
                    <span
                      class="h-4 w-4 flex-shrink-0 rounded-full"
                      [class]="s.done ? 'bg-brand ring-4 ring-brand/15' : 'bg-line'"
                    ></span>
                    @if (!last) {
                      <div
                        class="h-[3px] flex-1 rounded"
                        [class]="a.steps[i + 1].done ? 'bg-brand' : 'bg-line'"
                      ></div>
                    }
                  </div>
                }
              </div>
              <div class="mt-2 flex justify-between">
                @for (s of a.steps; track s.label) {
                  <span
                    class="flex-1 text-center text-[11.5px]"
                    [class]="s.done ? (s.current ? 'font-bold text-brand' : 'font-medium text-brand') : 'font-medium text-muted'"
                  >
                    {{ s.label }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PostulanteDashboard {
  readonly navigate = output<string>();
  protected readonly data = inject(PanelFacade).postulanteDashboard();
  protected readonly brand = PALETTE_HEX.brand;

  protected soft(kind: PanelColor): string {
    return SOFT_CLASSES[kind];
  }
  protected badge(kind: BadgeKind): string {
    return BADGE_CLASSES[kind];
  }
}
