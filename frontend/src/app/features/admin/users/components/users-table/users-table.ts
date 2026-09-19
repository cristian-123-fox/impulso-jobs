import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { Role } from '@/core/models/role.enum';
import { IjAvatar, IjCell, IjColumn, IjIcon, IjSortState, IjTable } from '@/shared/ui';
import { formatPhone } from '@/shared/utils/phone';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import {
  AdminUser,
  AssignedRole,
  STATUS_LABELS,
  UserStatus,
} from '@/features/admin/users/models/users.models';

const AVATAR_TONE: Record<Role, string> = {
  [Role.ADMIN]: 'bg-brand-50 text-brand-strong',
  [Role.EMPLOYER]: 'bg-accent-blue-soft text-accent-blue-strong',
  [Role.CANDIDATE]: 'bg-accent-green-soft text-accent-green-strong',
};

/**
 * Colores del estado. El punto delante toma el mismo color del texto, así que
 * cada entrada lleva el fondo y el color de texto y nada más.
 */
const STATUS_BADGE: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-accent-green-soft text-accent-green-strong',
  [UserStatus.INACTIVE]: 'bg-accent-amber-soft text-accent-amber-strong',
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
 *
 * Va `bare` dentro de la tarjeta del listado, que ya aporta borde y radio: la
 * barra de filtros, la tabla y la paginación comparten una sola caja.
 *
 * El orden es **de servidor**: el listado está paginado, así que ordenar en
 * cliente reordenaría sólo las 10 filas visibles. Los ids de columna
 * ordenable son los de `USER_SORT_COLUMNS` en el backend; cambiarlos aquí sin
 * cambiarlos allí deja la columna muerta (el backend ignora lo que no conoce).
 */
@Component({
  selector: 'app-users-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjAvatar, IjIcon, IjTable, IjCell, AdminEmpty],
  template: `
    @if (users().length === 0) {
      <app-admin-empty
        icon="users"
        [message]="emptyMessage()"
        hint="Ajusta los filtros o crea la cuenta desde el botón de arriba."
      />
    } @else {
      <ij-table
        [data]="users()"
        [columns]="columns()"
        sortMode="server"
        [selectable]="true"
        [bare]="true"
        [rowId]="rowId"
        [(sort)]="sort"
        (selectionChange)="selectionChange.emit($event)"
      >
        <ng-template ijCell="email" [ijCellOf]="users()" let-user>
          <div class="flex items-center gap-3">
            <ij-avatar
              class="h-10 w-10 rounded-xl text-[13px] font-extrabold"
              [class]="avatarTone()"
              [src]="user.photoUrl"
              [name]="user.displayName || user.email"
            />
            <div class="min-w-0">
              <div class="truncate text-[14.5px] font-bold text-ink-900">
                {{ user.displayName || user.email }}
              </div>
              @if (user.displayName) {
                <!-- Sin nombre, la línea de arriba ya es el correo: no se repite. -->
                <a
                  [href]="'mailto:' + user.email"
                  class="block truncate text-[12.5px] text-muted transition-colors hover:text-brand-strong"
                >
                  {{ user.email }}
                </a>
              }
            </div>
          </div>
        </ng-template>

        <ng-template ijCell="roles" [ijCellOf]="users()" let-user>
          <div class="flex flex-wrap items-center gap-1.5">
            @for (role of extraRoles(user); track role.id) {
              <span
                class="inline-block rounded-md bg-accent-blue-soft px-2 py-1 text-[11.5px] font-bold text-accent-blue-strong"
                [title]="role.code"
              >
                {{ role.name }}
              </span>
            } @empty {
              <span class="text-[13px] text-muted">Sin roles adicionales</span>
            }
          </div>
        </ng-template>

        <ng-template ijCell="companyName" [ijCellOf]="users()" let-user>
          @if (user.companyName) {
            <span class="text-[13.5px] font-semibold text-body">{{ user.companyName }}</span>
          } @else {
            <span class="text-[13.5px] text-muted">Sin empresa</span>
          }
        </ng-template>

        <ng-template ijCell="companyRole" [ijCellOf]="users()" let-user>
          @if (user.companyRole) {
            <span
              class="inline-block rounded-full bg-accent-blue-soft px-2.5 py-1 text-[12px] font-bold text-accent-blue-strong"
            >
              {{ companyRoleLabel(user.companyRole) }}
            </span>
          } @else {
            <span class="text-[13.5px] text-muted">Sin rol</span>
          }
        </ng-template>

        <ng-template ijCell="phone" [ijCellOf]="users()" let-user>
          @if (phoneOf(user); as phone) {
            <span class="text-[13.5px] text-body">{{ phone }}</span>
          } @else {
            <span class="text-[13.5px] text-muted">Sin teléfono</span>
          }
        </ng-template>

        <ng-template ijCell="status" [ijCellOf]="users()" let-user>
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
              [class]="statusBadge(user.status)"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
              {{ statusLabel(user.status) }}
            </span>
            @if (!user.emailVerified) {
              <span
                class="inline-block rounded-full bg-accent-amber-soft px-2.5 py-1 text-[12px] font-bold text-accent-amber-strong"
                title="El correo no ha sido verificado: no puede iniciar sesión."
              >
                Sin verificar
              </span>
            }
            @if (user.temporarilyBlocked) {
              <span
                class="inline-block rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700"
                title="Bloqueo temporal por intentos fallidos de inicio de sesión."
              >
                Bloqueado
              </span>
            }
          </div>
        </ng-template>

        <ng-template ijCell="createdAt" [ijCellOf]="users()" let-user>
          <div class="text-[13px] font-semibold text-body">
            {{ formatDate(user.createdAt) }}
            <div class="text-[11.5px] font-medium text-muted">
              {{ formatAgo(user.createdAt) }}
            </div>
          </div>
        </ng-template>

        <ng-template ijCell="actions" [ijCellOf]="users()" let-user>
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-ink-900 transition-colors hover:border-line hover:bg-surface hover:text-brand-strong active:translate-y-px"
              title="Editar"
              (click)="edit.emit(user)"
            >
              <ij-icon name="pen" [size]="14" />
              Editar
            </button>
            @if (user.status === active) {
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-brand-50 hover:text-brand-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                title="Desactivar"
                aria-label="Desactivar usuario"
                [disabled]="user.id === currentUserId()"
                (click)="deactivate.emit(user)"
              >
                <ij-icon name="pause" [size]="15" />
              </button>
            } @else {
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-accent-green-soft hover:text-accent-green-strong active:translate-y-px"
                title="Reactivar"
                aria-label="Reactivar usuario"
                (click)="activate.emit(user)"
              >
                <ij-icon name="play" [size]="15" />
              </button>
            }
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
              title="Eliminar"
              aria-label="Eliminar usuario"
              [disabled]="user.id === currentUserId()"
              (click)="remove.emit(user)"
            >
              <ij-icon name="trash" [size]="15" />
            </button>
          </div>
        </ng-template>
      </ij-table>
    }
  `,
})
export class UsersTable {
  readonly users = input.required<readonly AdminUser[]>();
  /** Tipo de cuenta que se está listando (pestaña activa). */
  readonly role = input.required<Role>();
  /** Id de la sesión: no se permite auto-desactivarse ni auto-eliminarse. */
  readonly currentUserId = input<string | null>(null);
  readonly sort = model<IjSortState | null>(null);
  readonly edit = output<AdminUser>();
  readonly activate = output<AdminUser>();
  readonly deactivate = output<AdminUser>();
  readonly remove = output<AdminUser>();
  readonly selectionChange = output<readonly AdminUser[]>();

  private readonly locale = inject(LocaleFormatService);

  protected readonly active = UserStatus.ACTIVE;
  protected readonly rowId = (user: AdminUser) => user.id;

  protected readonly emptyMessage = computed(() => EMPTY_MESSAGE[this.role()]);

  protected readonly columns = computed<IjColumn<AdminUser>[]>(() => {
    const role = this.role();
    const columns: IjColumn<AdminUser>[] = [
      {
        id: 'email',
        header: 'Usuario',
        sortable: true,
        value: (user) => user.displayName || user.email,
      },
    ];

    if (role === Role.ADMIN) {
      columns.push({ id: 'roles', header: 'Roles adicionales' });
    }
    if (role === Role.EMPLOYER) {
      columns.push(
        { id: 'companyName', header: 'Empresa' },
        { id: 'companyRole', header: 'Rol interno', hideBelow: 'md' },
      );
    }
    if (role === Role.CANDIDATE) {
      columns.push({ id: 'phone', header: 'Teléfono', hideBelow: 'sm' });
    }

    columns.push(
      { id: 'status', header: 'Estado', sortable: true },
      {
        id: 'createdAt',
        header: 'Alta',
        sortable: true,
        hideBelow: 'sm',
      },
      { id: 'actions', header: '', class: 'text-right' },
    );
    return columns;
  });

  /** El rol base ya lo indica la pestaña; aquí sólo los personalizados. */
  /**
   * Teléfono con su indicativo (`+52 33 1234 5678`). El de la cuenta manda y el
   * del perfil del aspirante es el respaldo, que es la precedencia que ya usa
   * el backend en `toUserResponse`. Un número que no encaje con su país se
   * pinta tal cual: es lo que hay guardado (T36).
   */
  protected phoneOf(user: AdminUser): string {
    const phone = user.phone ?? user.candidateProfile?.phone ?? null;
    if (!phone) return '';
    const country =
      user.phoneCountry ?? user.candidateProfile?.phoneCountry ?? null;
    return formatPhone(country, phone);
  }

  protected extraRoles(user: AdminUser): readonly AssignedRole[] {
    return (user.roles ?? []).filter((role) => !role.isSystem);
  }

  protected avatarTone(): string {
    return AVATAR_TONE[this.role()];
  }

  protected formatDate(value: string): string {
    return this.locale.shortDate(value);
  }

  protected formatAgo(value: string): string {
    return this.locale.relativeDate(value);
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
}
