import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';

/**
 * Paginación de los listados del back-office. Presentacional: recibe la página
 * actual y el total, y emite la página solicitada.
 */
@Component({
  selector: 'app-admin-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    @if (pages() > 1 || total() > 0) {
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span class="text-[13px] text-muted">
          {{ total() }} {{ total() === 1 ? 'registro' : 'registros' }} · página
          {{ page() }} de {{ pages() }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-body transition-colors hover:bg-surface active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            <ij-icon name="chevron-left" [size]="17" />
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-body transition-colors hover:bg-surface active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página siguiente"
            [disabled]="page() >= pages()"
            (click)="pageChange.emit(page() + 1)"
          >
            <ij-icon name="chevron-right" [size]="17" />
          </button>
        </div>
      </div>
    }
  `,
})
export class AdminPagination {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
}
