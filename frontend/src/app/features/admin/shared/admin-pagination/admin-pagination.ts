import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon } from '@/shared/ui';

/**
 * Paginación de los listados del back-office. Presentacional: recibe la página
 * actual y el total, y emite la página solicitada.
 *
 * Está traducida (T26) aunque viva en `features/admin`: el listado público de
 * vacantes la reutiliza, así que su texto sí se ve en el portal.
 */
@Component({
  selector: 'app-admin-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, TranslocoDirective],
  template: `
    @if (pages() > 1 || total() > 0) {
      <div *transloco="let t" class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span class="text-[13px] text-muted">
          {{
            total() === 1
              ? t('pagination.summaryOne', {
                  total: total(),
                  page: page(),
                  pages: pages(),
                })
              : t('pagination.summaryMany', {
                  total: total(),
                  page: page(),
                  pages: pages(),
                })
          }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-body transition-colors hover:bg-surface active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="t('pagination.prev')"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            <ij-icon name="chevron-left" [size]="17" />
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-body transition-colors hover:bg-surface active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="t('pagination.next')"
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
