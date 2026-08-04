import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Role } from '@/core/models/role.enum';
import { IjIcon } from '@/shared/ui';
import {
  AdminUser,
  AssignedRole,
  STATUS_LABELS,
  UserStatus,
} from '@/features/admin/users/models/users.models';

const AVATAR_TONE: Record<Role, string> = {
  [Role.ADMIN]: 'bg-brand-50 text-brand',
  [Role.EMPLOYER]: 'bg-accent-blue-soft text-accent-blue',
  [Role.CANDIDATE]: 'bg-accent-green-soft text-accent-green',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-accent-green-soft text-accent-green',
  [UserStatus.INACTIVE]: 'bg-surface text-muted',
  [UserStatus.SUSPENDED]: 'bg-red-50 text-red-700',
};

/** Rol interno dentro de la empresa (`company_users`). */
const COMPANY_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  RECRUITER: 'Reclutador',
  MEMBER: 'Miembro',
};

const EMPTY_MESSAGE: Record<Role, string> = {
  [Role.ADMIN]: 'No hay personal administrativo con estos filtros.',
  [Role.EMPLOYER]: 'No hay usuarios de empresa con estos filtros.',
  [Role.CANDIDATE]: 'No hay aspirantes con estos filtros.',
};

/**
 * Tabla de cuentas del tipo activo. Presentacional: sólo emite intenciones.
 * Las columnas dependen del tipo — la empresa y el rol interno sólo aplican a
 * las cuentas de empresa.
 */
@Component({
  selector: 'app-users-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            @for (h of headers(); track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold"
                    [class]="avatarTone()"
                  >
                    {{ initials(user) }}
                  </span>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-ink-900">
                      {{ user.displayName || user.email }}
                    </div>
                    @if (user.displayName) {
                      <div class="truncate text-[12.5px] text-muted">{{ user.email }}</div>
                    }
                  </div>
                </div>
              </td>

              @if (isAdmin()) {
                <td class="px-5 py-3.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    @for (role of extraRoles(user); track role.id) {
                      <span
                        class="inline-block rounded-md bg-accent-blue-soft px-2 py-1 text-[11.5px] font-bold text-accent-blue"
                        [title]="role.code"
                      >
                        {{ role.name }}
                      </span>
                    } @empty {
                      <span class="text-[13px] text-muted">Sin roles adicionales</span>
                    }
                  </div>
                </td>
              }

              @if (isEmployer()) {
                <td class="px-5 py-3.5 text-[13.5px] text-body">
                  {{ user.companyName || '—' }}
                </td>
                <td class="px-5 py-3.5">
                  @if (user.companyRole) {
                    <span
                      class="inline-block rounded-md bg-accent-blue-soft px-2 py-1 text-[11.5px] font-bold text-accent-blue"
                    >
                      {{ companyRoleLabel(user.companyRole) }}
                    </span>
                  } @else {
                    <span class="text-[13.5px] text-muted">—</span>
                  }
                </td>
              }

              <td class="px-5 py-3.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                    [class]="statusBadge(user.status)"
                  >
                    {{ statusLabel(user.status) }}
                  </span>
                  @if (!user.emailVerified) {
                    <span
                      class="inline-block rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-[#b26a15]"
                      title="El correo no ha sido verificado: no puede iniciar sesión."
                    >
                      Sin verificar
                    </span>
                  }
                  @if (user.temporarilyBlocked) {
                    <span
                      class="inline-block rounded-md bg-red-50 px-2 py-1 text-[11.5px] font-bold text-red-700"
                      title="Bloqueo temporal por intentos fallidos de inicio de sesión."
                    >
                      Bloqueado
                    </span>
                  }
                </div>
              </td>

              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ user.createdAt | date: 'dd MMM yyyy' }}
              </td>

              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-brand"
                    title="Editar"
                    aria-label="Editar usuario"
                    (click)="edit.emit(user)"
                  >
                    <ij-icon name="pen" [size]="15" />
                  </button>
                  @if (user.status === active) {
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Desactivar"
                      aria-label="Desactivar usuario"
                      [disabled]="user.id === currentUserId()"
                      (click)="deactivate.emit(user)"
                    >
                      <ij-icon name="shield" [size]="15" />
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-accent-green"
                      title="Reactivar"
                      aria-label="Reactivar usuario"
                      (click)="activate.emit(user)"
                    >
                      <ij-icon name="check" [size]="15" />
                    </button>
                  }
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Eliminar"
                    aria-label="Eliminar usuario"
                    [disabled]="user.id === currentUserId()"
                    (click)="remove.emit(user)"
                  >
                    <ij-icon name="x" [size]="16" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td
                [attr.colspan]="headers().length"
                class="px-5 py-10 text-center text-[13.5px] text-muted"
              >
                {{ emptyMessage() }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersTable {
  readonly users = input.required<readonly AdminUser[]>();
  /** Tipo de cuenta que se está listando (pestaña activa). */
  readonly role = input.required<Role>();
  /** Id de la sesión: no se permite auto-desactivarse ni auto-eliminarse. */
  readonly currentUserId = input<string | null>(null);
  readonly edit = output<AdminUser>();
  readonly activate = output<AdminUser>();
  readonly deactivate = output<AdminUser>();
  readonly remove = output<AdminUser>();

  protected readonly active = UserStatus.ACTIVE;

  protected readonly isEmployer = computed(() => this.role() === Role.EMPLOYER);
  protected readonly isAdmin = computed(() => this.role() === Role.ADMIN);

  protected readonly headers = computed(() => {
    if (this.isEmployer()) {
      return ['Usuario', 'Empresa', 'Rol interno', 'Estado', 'Alta', ''];
    }
    if (this.isAdmin()) {
      return ['Usuario', 'Roles adicionales', 'Estado', 'Alta', ''];
    }
    return ['Usuario', 'Estado', 'Alta', ''];
  });

  /** El rol base ya lo indica la pestaña; aquí sólo los personalizados. */
  protected extraRoles(user: AdminUser): readonly AssignedRole[] {
    return (user.roles ?? []).filter((role) => !role.isSystem);
  }

  protected readonly emptyMessage = computed(() => EMPTY_MESSAGE[this.role()]);

  protected avatarTone(): string {
    return AVATAR_TONE[this.role()];
  }

  protected statusLabel(status: UserStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: UserStatus): string {
    return STATUS_BADGE[status] ?? STATUS_BADGE[UserStatus.INACTIVE];
  }

  protected companyRoleLabel(role: string): string {
    return COMPANY_ROLE_LABELS[role] ?? role;
  }

  protected initials(user: AdminUser): string {
    const source = user.displayName?.trim() || user.email;
    const parts = source.split(/[\s@.]+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
  }
}
