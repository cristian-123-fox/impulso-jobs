import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { RoleSummary } from '@/features/admin/roles/models/roles.models';

/** Acción solicitada sobre un rol desde la tabla. */
export type RoleAction = 'open' | 'edit' | 'remove';

export interface RoleActionEvent {
  action: RoleAction;
  role: RoleSummary;
}

/** Tabla de roles (presentacional). Sólo emite intenciones. */
@Component({
  selector: 'app-roles-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            @for (h of headers; track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (role of roles(); track role.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-ink-900 transition-colors hover:text-brand"
                  (click)="emit('open', role)"
                >
                  {{ role.name }}
                </button>
              </td>
              <td class="px-5 py-3.5">
                <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand">
                  {{ role.code }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-muted">{{ role.description || '—' }}</td>
              <td class="px-5 py-3.5">
                @if (role.isSystem) {
                  <span class="rounded-md bg-surface px-2 py-1 text-[11.5px] font-semibold text-muted">
                    Sistema
                  </span>
                } @else {
                  <span
                    class="rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-semibold text-accent-green"
                  >
                    Personalizado
                  </span>
                }
              </td>
              <td class="px-5 py-3.5">
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
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-body"
                    [title]="
                      role.isSystem ? 'Los roles de sistema no se eliminan' : 'Eliminar rol'
                    "
                    aria-label="Eliminar rol"
                    [disabled]="role.isSystem"
                    (click)="emit('remove', role)"
                  >
                    <ij-icon name="x" [size]="16" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-5 py-10 text-center text-[13.5px] text-muted">
                No hay roles. Ejecuta <code>pnpm run seed:rbac</code> o crea el primero.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class RolesTable {
  readonly roles = input.required<readonly RoleSummary[]>();
  readonly action = output<RoleActionEvent>();

  protected readonly headers = ['Rol', 'Código', 'Descripción', 'Tipo', ''];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand';

  protected emit(action: RoleAction, role: RoleSummary): void {
    this.action.emit({ action, role });
  }
}
