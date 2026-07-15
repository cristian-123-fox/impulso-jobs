import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RoleSummary } from '@/features/admin/roles/models/roles.models';

/** Tabla de roles (presentacional). Emite la fila seleccionada. */
@Component({
  selector: 'app-roles-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            @for (h of ['Rol', 'Código', 'Descripción', 'Tipo']; track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (role of roles(); track role.id) {
            <tr
              class="cursor-pointer border-b border-line/70 transition-colors hover:bg-surface"
              (click)="select.emit(role)"
            >
              <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">{{ role.name }}</td>
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
                  <span class="rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-semibold text-accent-green">
                    Personalizado
                  </span>
                }
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
  readonly select = output<RoleSummary>();
}
