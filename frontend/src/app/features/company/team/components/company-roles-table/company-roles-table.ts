import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { CompanyRole } from '@/features/company/team/models/team.models';

export type CompanyRoleAction = 'edit' | 'delete';

export interface CompanyRoleActionEvent {
  action: CompanyRoleAction;
  role: CompanyRole;
}

/**
 * Roles de la empresa. La primera fila es fija, **Acceso completo**: no es un
 * rol que se cree, es lo que tiene quien no tiene ninguno (y siempre el
 * propietario y los administradores). Enseñarla evita la pregunta "¿y los que
 * no tienen rol, qué pueden hacer?".
 */
@Component({
  selector: 'app-company-roles-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line bg-surface/60">
            @for (h of headers; track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-line/70 bg-surface/30">
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <ij-icon name="shield" [size]="15" class="text-brand-strong" />
                Acceso completo
                <span class="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                  Predeterminado
                </span>
              </div>
              <div class="mt-0.5 text-[12.5px] text-muted">
                Todo lo que permite tu cuenta de empresa. Lo tienen siempre el propietario y los
                administradores.
              </div>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-muted">Todos</td>
            <td class="px-5 py-3.5 text-[13px] text-muted">—</td>
            <td class="px-5 py-3.5"></td>
          </tr>
          @for (role of roles(); track role.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="text-sm font-semibold text-ink-900">{{ role.name }}</div>
                @if (role.description) {
                  <div class="mt-0.5 max-w-[420px] truncate text-[12.5px] text-muted" [title]="role.description">
                    {{ role.description }}
                  </div>
                }
              </td>
              <td class="px-5 py-3.5 text-[13.5px] font-bold text-ink-900">
                {{ role.permissionCodes.length }}
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ role.memberCount === 1 ? '1 persona' : role.memberCount + ' personas' }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    [class]="actionClass"
                    title="Editar rol y permisos"
                    aria-label="Editar rol"
                    (click)="action.emit({ action: 'edit', role })"
                  >
                    <ij-icon name="pen" [size]="15" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-body"
                    [title]="
                      role.memberCount > 0
                        ? 'Cámbiale el rol a quien lo tiene antes de borrarlo'
                        : 'Eliminar rol'
                    "
                    aria-label="Eliminar rol"
                    [disabled]="role.memberCount > 0"
                    (click)="action.emit({ action: 'delete', role })"
                  >
                    <ij-icon name="trash" [size]="15" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="px-5 py-8 text-center text-[13.5px] text-muted">
                Aún no has creado roles. Crea uno para limitar lo que puede hacer una persona del
                equipo; por ejemplo, un reclutador que revisa postulaciones pero no contrata planes.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompanyRolesTable {
  readonly roles = input.required<readonly CompanyRole[]>();
  readonly action = output<CompanyRoleActionEvent>();

  protected readonly headers = ['Rol', 'Permisos', 'Asignado a', ''];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand';
}
