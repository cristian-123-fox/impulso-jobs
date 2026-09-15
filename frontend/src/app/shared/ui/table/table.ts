import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  createSortedRowModel,
  injectTable,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  type RowData,
  type SortingState,
} from '@tanstack/angular-table';
import { IjIcon } from '@/shared/ui/icon/icon';
import { IjCell } from '@/shared/ui/table/cell.directive';
import { IjColumn, IjSortState } from '@/shared/ui/table/table.models';

/**
 * `features` es estable a propósito: el inicializador de `injectTable` se
 * reejecuta con cada lectura de señal, y reconstruirlo ahí invalidaría la
 * memoización de TanStack.
 */
const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
});

const HIDE_BELOW_CLASS: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/**
 * Tabla del back-office. TanStack Table en modo headless: aporta el orden, la
 * selección y el modelo de filas; el marcado y las clases son del kit ij-*,
 * así que no entra ninguna hoja de estilos ajena.
 *
 * El contenido de cada celda lo pone el consumidor con `ijCell`, de modo que
 * las tablas conservan sus avatares, badges y botones tal cual.
 *
 * Dos modos de orden:
 *  - `client`: TanStack ordena las filas recibidas. Para listas completas.
 *  - `server`: la tabla sólo refleja el estado y avisa por `sort`; ordenar es
 *    cosa del backend. Para listados paginados, donde ordenar en cliente
 *    reordenaría sólo la página visible y mentiría al usuario.
 */
@Component({
  selector: 'ij-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl border border-line bg-white">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-line bg-surface/60">
            @if (selectable()) {
              <th scope="col" class="w-[46px] px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                  [attr.aria-label]="
                    allSelected() ? 'Deseleccionar todo' : 'Seleccionar todo'
                  "
                  [checked]="allSelected()"
                  [indeterminate]="someSelected() && !allSelected()"
                  (change)="toggleAll()"
                />
              </th>
            }
            @for (column of columns(); track column.id) {
              <th
                scope="col"
                class="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-muted"
                [class]="headerClass(column)"
                [attr.aria-sort]="ariaSort(column)"
              >
                @if (column.sortable) {
                  <button
                    type="button"
                    class="group inline-flex items-center gap-1.5 rounded transition-colors hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    (click)="toggleSort(column.id)"
                  >
                    {{ column.header }}
                    <ij-icon
                      [name]="sortIcon(column.id)"
                      [size]="13"
                      [strokeWidth]="2.2"
                      [class]="sortIconClass(column.id)"
                    />
                  </button>
                } @else {
                  {{ column.header }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track rowKey(row.original, $index)) {
            <tr
              class="border-b border-line transition-colors last:border-0 hover:bg-surface/50"
              [class.bg-brand-50]="selectable() && row.getIsSelected()"
            >
              @if (selectable()) {
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    [attr.aria-label]="'Seleccionar fila ' + ($index + 1)"
                    [checked]="row.getIsSelected()"
                    (change)="row.toggleSelected()"
                  />
                </td>
              }
              @for (column of columns(); track column.id) {
                <td class="px-4 py-3 align-middle" [class]="cellClass(column)">
                  @if (templateFor(column.id); as cellTemplate) {
                    <ng-container
                      [ngTemplateOutlet]="cellTemplate"
                      [ngTemplateOutletContext]="{
                        $implicit: row.original,
                        row: row.original,
                        index: $index,
                      }"
                    />
                  } @else {
                    {{ column.value?.(row.original) ?? '' }}
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class IjTable<T extends RowData> {
  readonly data = input.required<readonly T[]>();
  readonly columns = input.required<readonly IjColumn<T>[]>();
  /** `server` delega el orden al backend; `client` lo hace TanStack. */
  readonly sortMode = input<'client' | 'server'>('client');
  readonly selectable = input(false);
  /**
   * Clave estable de la fila. Sin ella la selección se pierde al reordenar o
   * al recargar, porque TanStack cae al índice de la fila.
   */
  readonly rowId = input<((row: T) => string) | undefined>(undefined);

  readonly sort = model<IjSortState | null>(null);
  readonly selectionChange = output<readonly T[]>();

  private readonly cells = contentChildren(IjCell);

  private readonly sortingState = computed<SortingState>(() => {
    const current = this.sort();
    if (!current) return [];
    return [{ id: current.column, desc: current.order === 'DESC' }];
  });

  private readonly table = injectTable<typeof TABLE_FEATURES, T>(() => ({
    features: TABLE_FEATURES,
    columns: this.columns().map((column) => ({
      id: column.id,
      accessorFn: (row: T) => column.value?.(row) ?? '',
      enableSorting: Boolean(column.sortable),
    })),
    data: this.data() as T[],
    getRowId: this.buildRowId(),
    state: { sorting: this.sortingState() },
    // En modo servidor TanStack no reordena: sólo refleja el estado.
    manualSorting: this.sortMode() === 'server',
    enableRowSelection: this.selectable(),
    onSortingChange: (next: SortingState | ((old: SortingState) => SortingState)) =>
      this.applySorting(next),
  }));

  protected readonly rows = computed(() => {
    // Dependencias explícitas: el modelo de filas no es una señal.
    this.data();
    this.sortingState();
    this.selectionVersion();
    return this.table.getRowModel().rows;
  });

  /** Se incrementa en cada cambio de selección para recalcular la vista. */
  private readonly selectionVersion = computed(() =>
    this.table.atoms.rowSelection.get(),
  );

  protected readonly allSelected = computed(() => {
    this.selectionVersion();
    this.data();
    return this.table.getIsAllRowsSelected();
  });

  protected readonly someSelected = computed(() => {
    this.selectionVersion();
    this.data();
    return this.table.getIsSomeRowsSelected();
  });

  constructor() {
    effect(() => {
      this.selectionVersion();
      const selected = untracked(() =>
        this.table.getSelectedRowModel().rows.map((row) => row.original as T),
      );
      this.selectionChange.emit(selected);
    });
  }

  protected rowKey(row: T, index: number): string {
    const id = this.rowId();
    return id ? id(row) : String(index);
  }

  protected templateFor(columnId: string) {
    return this.cells().find((cell) => cell.ijCell() === columnId)?.template;
  }

  protected toggleAll(): void {
    this.table.toggleAllRowsSelected();
  }

  /** Ciclo de tres pasos: ascendente, descendente y sin orden. */
  protected toggleSort(columnId: string): void {
    const current = this.sort();
    if (current?.column !== columnId) {
      this.sort.set({ column: columnId, order: 'ASC' });
      return;
    }
    this.sort.set(
      current.order === 'ASC' ? { column: columnId, order: 'DESC' } : null,
    );
  }

  protected sortIcon(columnId: string): 'chevron-up' | 'chevron-down' {
    const current = this.sort();
    return current?.column === columnId && current.order === 'DESC'
      ? 'chevron-down'
      : 'chevron-up';
  }

  protected sortIconClass(columnId: string): string {
    return this.sort()?.column === columnId
      ? 'text-brand-strong'
      : 'opacity-0 transition-opacity group-hover:opacity-50';
  }

  protected ariaSort(column: IjColumn<T>): string | null {
    if (!column.sortable) return null;
    const current = this.sort();
    if (current?.column !== column.id) return 'none';
    return current.order === 'ASC' ? 'ascending' : 'descending';
  }

  protected headerClass(column: IjColumn<T>): string {
    return this.sharedClass(column);
  }

  protected cellClass(column: IjColumn<T>): string {
    return this.sharedClass(column);
  }

  private sharedClass(column: IjColumn<T>): string {
    const hide = column.hideBelow ? HIDE_BELOW_CLASS[column.hideBelow] : '';
    return [column.class ?? '', hide].filter(Boolean).join(' ');
  }

  private buildRowId(): ((row: T, index: number) => string) | undefined {
    const id = this.rowId();
    return id ? (row: T) => id(row) : undefined;
  }

  /** TanStack manda un valor o un actualizador; aquí sólo interesa el valor. */
  private applySorting(
    next: SortingState | ((old: SortingState) => SortingState),
  ): void {
    const resolved =
      typeof next === 'function' ? next(this.sortingState()) : next;
    const first = resolved[0];
    this.sort.set(
      first ? { column: first.id, order: first.desc ? 'DESC' : 'ASC' } : null,
    );
  }
}
