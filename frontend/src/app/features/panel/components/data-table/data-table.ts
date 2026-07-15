import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  BadgeKind,
  PanelColor,
  PanelTable,
} from '@/features/panel/models/panel.models';
import {
  BADGE_CLASSES,
  matchBarColor,
  matchTextClass,
  SOFT_CLASSES,
} from '@/features/panel/panel.theme';

const PAGE_SIZE = 5;

/** Tabla genérica del panel: filtros (visuales), celdas tipadas y paginación. */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card">
      @if (table().title) {
        <h3 class="mb-4 text-base font-bold text-ink-900">{{ table().title }}</h3>
      }

      @if ((table().filters ?? []).length) {
        <div class="mb-4 flex flex-wrap gap-2.5">
          @for (f of table().filters ?? []; track f; let first = $first) {
            <span
              class="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-semibold"
              [class]="first ? 'bg-brand text-white' : 'bg-surface text-body'"
            >
              {{ f }}
            </span>
          }
        </div>
      }

      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse">
          <thead>
            <tr class="text-left">
              @for (col of table().columns; track col) {
                <th
                  class="whitespace-nowrap pb-3 pr-4 text-[11.5px] font-bold uppercase tracking-wide text-muted"
                >
                  {{ col }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of visibleRows(); track $index) {
              <tr class="border-t border-line align-middle transition-colors hover:bg-surface/60">
                @for (cell of row; track $index) {
                  <td class="py-3.5 pr-4">
                    @switch (cell.type) {
                      @case ('avatar') {
                        <div class="flex items-center gap-3">
                          <span
                            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[12.5px] font-bold"
                            [class]="soft(cell.kind)"
                          >
                            {{ cell.initials }}
                          </span>
                          <div class="min-w-0">
                            <div class="whitespace-nowrap text-sm font-semibold text-ink-900">
                              {{ cell.name }}
                            </div>
                            @if (cell.sub) {
                              <div class="whitespace-nowrap text-xs text-muted">{{ cell.sub }}</div>
                            }
                          </div>
                        </div>
                      }
                      @case ('badge') {
                        <span
                          class="inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-bold"
                          [class]="badge(cell.badgeKind)"
                        >
                          {{ cell.text }}
                        </span>
                      }
                      @case ('progress') {
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-14 overflow-hidden rounded bg-surface">
                            <div
                              class="h-full rounded"
                              [style.width.%]="cell.pct"
                              [style.background]="matchColor(cell.pct ?? 0)"
                            ></div>
                          </div>
                          <span class="text-[13px] font-bold" [class]="matchText(cell.pct ?? 0)">
                            {{ cell.pct }}%
                          </span>
                        </div>
                      }
                      @default {
                        <span class="whitespace-nowrap" [class]="textClass(cell.variant)">
                          {{ cell.text }}
                        </span>
                      }
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showPager()) {
        <div class="mt-[18px] flex flex-wrap items-center justify-between gap-3.5 border-t border-line pt-4">
          <span class="text-[12.5px] text-muted">{{ pagerText() }}</span>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Anterior"
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-line disabled:text-line"
              [class]="currentPage() === 0 ? 'text-line' : 'text-body hover:bg-surface'"
              [disabled]="currentPage() === 0"
              (click)="pageChange.emit(currentPage() - 1)"
            >
              <ij-icon name="chevron-left" [size]="16" />
            </button>
            @for (n of pageNumbers(); track n) {
              <button
                type="button"
                class="h-[34px] min-w-[34px] rounded-[9px] border px-2 text-[13px] font-bold"
                [class]="n === currentPage() ? 'border-brand bg-brand text-white' : 'border-line bg-white text-body hover:bg-surface'"
                (click)="pageChange.emit(n)"
              >
                {{ n + 1 }}
              </button>
            }
            <button
              type="button"
              aria-label="Siguiente"
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-line disabled:text-line"
              [class]="currentPage() >= pages() - 1 ? 'text-line' : 'text-body hover:bg-surface'"
              [disabled]="currentPage() >= pages() - 1"
              (click)="pageChange.emit(currentPage() + 1)"
            >
              <ij-icon name="chevron-right" [size]="16" />
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTable {
  readonly table = input.required<PanelTable>();
  readonly page = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.table().rows.length / PAGE_SIZE)),
  );
  protected readonly currentPage = computed(() =>
    Math.min(this.page(), this.pages() - 1),
  );
  protected readonly visibleRows = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.table().rows.slice(start, start + PAGE_SIZE);
  });
  protected readonly showPager = computed(() => this.pages() > 1);
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pages() }, (_, i) => i),
  );
  protected readonly pagerText = computed(() => {
    const total = this.table().rows.length;
    const start = this.currentPage() * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    return `Mostrando ${total === 0 ? 0 : start + 1}–${end} de ${total}`;
  });

  protected soft(kind: PanelColor | undefined): string {
    return SOFT_CLASSES[kind ?? 'brand'];
  }
  protected badge(kind: BadgeKind | undefined): string {
    return BADGE_CLASSES[kind ?? 'gray'];
  }
  protected matchColor(pct: number): string {
    return matchBarColor(pct);
  }
  protected matchText(pct: number): string {
    return matchTextClass(pct);
  }
  protected textClass(variant: 'default' | 'strong' | 'muted' | undefined): string {
    if (variant === 'strong') return 'text-sm font-semibold text-ink-900';
    if (variant === 'muted') return 'text-[13px] text-muted';
    return 'text-[13.5px] text-body';
  }
}
