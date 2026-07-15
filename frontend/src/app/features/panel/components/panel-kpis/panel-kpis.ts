import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { PanelKpi } from '@/features/panel/models/panel.models';
import { SOFT_CLASSES } from '@/features/panel/panel.theme';

/** Fila de tarjetas KPI. Presentacional: recibe la lista ya resuelta. */
@Component({
  selector: 'app-panel-kpis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      @for (k of kpis(); track k.label) {
        <div class="rounded-2xl bg-white p-5 shadow-card">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-[13px] font-semibold text-muted">{{ k.label }}</div>
              <div class="mt-1.5 text-[26px] font-extrabold tracking-tight text-ink-900">
                {{ k.value }}
              </div>
            </div>
            <div
              class="flex h-[46px] w-[46px] items-center justify-center rounded-[13px]"
              [class]="soft(k.kind)"
            >
              <ij-icon [name]="k.icon" [size]="22" [strokeWidth]="1.9" />
            </div>
          </div>
          <div class="mt-3.5 flex min-h-[18px] items-center gap-1 text-[12.5px]">
            @if (k.delta) {
              <span class="font-bold" [class]="k.up ? 'text-accent-green' : 'text-[#e05b5b]'">
                {{ k.up ? '↑' : '↓' }} {{ k.delta }}
              </span>
            }
            @if (k.note) {
              <span class="font-medium text-muted">{{ k.note }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PanelKpis {
  readonly kpis = input.required<readonly PanelKpi[]>();

  protected soft(kind: PanelKpi['kind']): string {
    return SOFT_CLASSES[kind];
  }
}
