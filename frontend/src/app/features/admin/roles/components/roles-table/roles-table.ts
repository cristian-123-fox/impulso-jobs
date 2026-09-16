import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { IjCell, IjColumn, IjIcon, IjSortState, IjTable } from '@/shared/ui';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import { RoleSummary } from '@/features/admin/roles/models/roles.models';

/** Acción solicitada sobre un rol desde la tabla. */
export type RoleAction = 'open' | 'edit' | 'remove';

export interface RoleActionEvent {
  action: RoleAction;
  role: RoleSummary;
}

/**
 * Tabla de roles (presentacional). Sólo emite intenciones.
 *
 * Orden **de cliente**: `GET /admin/roles` devuelve la lista completa sin
 * paginar, así que TanStack la ordena sin ir al servidor.
 */
@Component({
  selector: 'app-roles-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjTable, IjCell, AdminEmpty],
  template: `
    @if (roles().length === 0) {
      <app-admin-empty icon="shield" message="No hay roles.">
        <p class="max-w-[420px] text-[12.5px] text-muted">
          Ejecuta <code>pnpm run seed:rbac</code> o crea el primero con el botón
          de arriba.
        </p>
      </app-admin-empty>
    } @else {
      <ij-table
        [data]="roles()"
        [columns]="columns"
        sortMode="client"
        [bare]="true"
        [rowId]="rowId"
        [(sort)]="sort"
      >
        <ng-template ijCell="name" [ijCellOf]="roles()" let-role>
          <button
            type="button"
            class="text-left text-sm font-semibold text-ink-900 transition-colors hover:text-brand-strong"
            (click)="emit('open', role)"
          >
            {{ role.name }}
          </button>
        </ng-template>

        <ng-template ijCell="code" [ijCellOf]="roles()" let-role>
          <span
            class="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-strong"
          >
            {{ role.code }}
          </span>
        </ng-template>

        <ng-template ijCell="description" [ijCellOf]="roles()" let-role>
          <span class="text-[13.5px] text-muted">
            {{ role.description || 'Sin descripción' }}
          </span>
        </ng-template>

        <ng-template ijCell="isSystem" [ijCellOf]="roles()" let-role>
          @if (role.isSystem) {
            <span
              class="rounded-md bg-surface px-2 py-1 text-[11.5px] font-semibold text-muted"
            >
              Sistema
            </span>
          } @else {
            <span
              class="rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-semibold text-accent-green-strong"
            >
              Personalizado
            </span>
          }
        </ng-template>

        <ng-template ijCell="actions" [ijCellOf]="roles()" let-role>
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              [class]="actionClass"
              title="Permisos del rol"
              aria-label="Permisos del rol"
              (click)="emit('open', role)"
            >
              <ij-icon name="shield" [size]="15" />
            </button>
            <button
              type="button"
              [class]="actionClass"
              title="Editar nombre y descripción"
              aria-label="Editar rol"
              (click)="emit('edit', role)"
            >
              <ij-icon name="pen" [size]="15" />
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-body"
              [title]="
                role.isSystem
                  ? 'Los roles de sistema no se eliminan'
                  : 'Eliminar rol'
              "
              aria-label="Eliminar rol"
              [disabled]="role.isSystem"
              (click)="emit('remove', role)"
            >
              <ij-icon name="trash" [size]="15" />
            </button>
          </div>
        </ng-template>
      </ij-table>
    }
  `,
})
export class RolesTable {
  readonly roles = input.required<readonly RoleSummary[]>();
  readonly sort = model<IjSortState | null>(null);
  readonly action = output<RoleActionEvent>();

  protected readonly rowId = (role: RoleSummary) => role.id;

  protected readonly columns: IjColumn<RoleSummary>[] = [
    { id: 'name', header: 'Rol', sortable: true, value: (r) => r.name },
    {
      id: 'code',
      header: 'Código',
      sortable: true,
      value: (r) => r.code,
      hideBelow: 'sm',
    },
    { id: 'description', header: 'Descripción', hideBelow: 'lg' },
    {
      id: 'isSystem',
      header: 'Tipo',
      sortable: true,
      value: (r) => (r.isSystem ? 1 : 0),
      hideBelow: 'md',
    },
    { id: 'actions', header: '', class: 'text-right' },
  ];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px]';

  protected emit(action: RoleAction, role: RoleSummary): void {
    this.action.emit({ action, role });
  }
}
