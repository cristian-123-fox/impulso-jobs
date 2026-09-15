import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { IjCell, IjColumn, IjIcon, IjSortState, IjTable } from '@/shared/ui';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import {
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/admin/companies/models/companies.models';

const ROLE_BADGE: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'bg-brand-50 text-brand-strong',
  [CompanyMemberRole.ADMIN]: 'bg-accent-blue-soft text-accent-blue-strong',
  [CompanyMemberRole.RECRUITER]:
    'bg-accent-green-soft text-accent-green-strong',
  [CompanyMemberRole.MEMBER]: 'bg-surface text-muted',
};

/** Orden jerárquico del rol interno, para que ordenar por él tenga sentido. */
const ROLE_RANK: Record<CompanyMemberRole, number> = {
  [CompanyMemberRole.OWNER]: 0,
  [CompanyMemberRole.ADMIN]: 1,
  [CompanyMemberRole.RECRUITER]: 2,
  [CompanyMemberRole.MEMBER]: 3,
};

/**
 * Equipo de la empresa y su rol interno. Presentacional.
 *
 * Orden **de cliente**: el equipo llega entero con la ficha, sin paginar.
 */
@Component({
  selector: 'app-company-members-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon, IjTable, IjCell, AdminEmpty],
  template: `
    @if (members().length === 0) {
      <app-admin-empty
        icon="users"
        message="Esta empresa aún no tiene usuarios en su equipo."
        hint="Usa el botón de arriba para vincular una cuenta existente o crear una nueva."
      />
    } @else {
      <ij-table
        [data]="members()"
        [columns]="columns"
        sortMode="client"
        [rowId]="rowId"
        [(sort)]="sort"
      >
        <ng-template ijCell="email" [ijCellOf]="members()" let-member>
          <div class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
              [class]="roleBadge(member.companyRole)"
            >
              {{ initials(member.email) }}
            </span>
            <span class="truncate text-sm font-semibold text-ink-900">
              {{ member.email }}
            </span>
          </div>
        </ng-template>

        <ng-template ijCell="companyRole" [ijCellOf]="members()" let-member>
          <span
            class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
            [class]="roleBadge(member.companyRole)"
          >
            {{ roleLabel(member.companyRole) }}
          </span>
        </ng-template>

        <ng-template ijCell="status" [ijCellOf]="members()" let-member>
          <div class="flex flex-wrap items-center gap-1.5">
            @if (member.status === 'ACTIVE') {
              <span
                class="inline-block rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-bold text-accent-green-strong"
              >
                Activo
              </span>
            } @else {
              <span
                class="inline-block rounded-md bg-surface px-2 py-1 text-[11.5px] font-bold text-muted"
              >
                Inactivo
              </span>
            }
            @if (!member.emailVerified) {
              <span
                class="inline-block rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-accent-amber-strong"
                title="El correo no ha sido verificado: no puede iniciar sesión."
              >
                Sin verificar
              </span>
            }
          </div>
        </ng-template>

        <ng-template ijCell="joinedAt" [ijCellOf]="members()" let-member>
          <span class="text-[13px] text-muted">
            {{ member.joinedAt | date: 'dd MMM yyyy' }}
          </span>
        </ng-template>

        <ng-template ijCell="actions" [ijCellOf]="members()" let-member>
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px]"
              title="Cambiar rol interno"
              aria-label="Cambiar rol interno"
              (click)="changeRole.emit(member)"
            >
              <ij-icon name="pen" [size]="15" />
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
              [title]="removeTitle(member)"
              aria-label="Quitar del equipo"
              [disabled]="isLastOwner(member)"
              (click)="remove.emit(member)"
            >
              <ij-icon name="x" [size]="16" />
            </button>
          </div>
        </ng-template>
      </ij-table>
    }
  `,
})
export class CompanyMembersTable {
  readonly members = input.required<readonly CompanyMember[]>();
  readonly sort = model<IjSortState | null>(null);
  readonly changeRole = output<CompanyMember>();
  readonly remove = output<CompanyMember>();

  protected readonly rowId = (member: CompanyMember) => member.userId;

  protected readonly columns: IjColumn<CompanyMember>[] = [
    { id: 'email', header: 'Usuario', sortable: true, value: (m) => m.email },
    {
      id: 'companyRole',
      header: 'Rol interno',
      sortable: true,
      // Por jerarquía, no alfabéticamente: "Propietario" antes que "Miembro".
      value: (m) => ROLE_RANK[m.companyRole] ?? 9,
    },
    {
      id: 'status',
      header: 'Cuenta',
      sortable: true,
      value: (m) => m.status,
      hideBelow: 'sm',
    },
    {
      id: 'joinedAt',
      header: 'Desde',
      sortable: true,
      value: (m) => m.joinedAt,
      hideBelow: 'md',
    },
    { id: 'actions', header: '', class: 'text-right' },
  ];

  protected roleLabel(role: CompanyMemberRole): string {
    return COMPANY_MEMBER_ROLE_LABELS[role] ?? role;
  }

  protected roleBadge(role: CompanyMemberRole): string {
    return ROLE_BADGE[role] ?? ROLE_BADGE[CompanyMemberRole.MEMBER];
  }

  /** Toda empresa conserva un propietario: el último no se puede quitar. */
  protected isLastOwner(member: CompanyMember): boolean {
    if (member.companyRole !== CompanyMemberRole.OWNER) return false;
    return (
      this.members().filter((m) => m.companyRole === CompanyMemberRole.OWNER)
        .length <= 1
    );
  }

  protected removeTitle(member: CompanyMember): string {
    return this.isLastOwner(member)
      ? 'No puedes quitar al único propietario'
      : 'Quitar del equipo';
  }

  protected initials(email: string): string {
    const parts = email.split(/[\s@.]+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
  }
}
