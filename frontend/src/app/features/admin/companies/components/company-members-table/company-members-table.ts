import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/admin/companies/models/companies.models';

const ROLE_BADGE: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'bg-brand-50 text-brand',
  [CompanyMemberRole.ADMIN]: 'bg-accent-blue-soft text-accent-blue',
  [CompanyMemberRole.RECRUITER]: 'bg-accent-green-soft text-accent-green',
  [CompanyMemberRole.MEMBER]: 'bg-surface text-muted',
};

/** Equipo de la empresa y su rol interno. Presentacional. */
@Component({
  selector: 'app-company-members-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
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
          @for (member of members(); track member.userId) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold"
                    [class]="roleBadge(member.companyRole)"
                  >
                    {{ initials(member.email) }}
                  </span>
                  <span class="truncate text-sm font-semibold text-ink-900">
                    {{ member.email }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                  [class]="roleBadge(member.companyRole)"
                >
                  {{ roleLabel(member.companyRole) }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  @if (member.status === 'ACTIVE') {
                    <span
                      class="inline-block rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-bold text-accent-green"
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
                      class="inline-block rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-[#b26a15]"
                      title="El correo no ha sido verificado: no puede iniciar sesión."
                    >
                      Sin verificar
                    </span>
                  }
                </div>
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ member.joinedAt | date: 'dd MMM yyyy' }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-brand"
                    title="Cambiar rol interno"
                    aria-label="Cambiar rol interno"
                    (click)="changeRole.emit(member)"
                  >
                    <ij-icon name="pen" [size]="15" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    [title]="removeTitle(member)"
                    aria-label="Quitar del equipo"
                    [disabled]="isLastOwner(member)"
                    (click)="remove.emit(member)"
                  >
                    <ij-icon name="x" [size]="16" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-5 py-10 text-center text-[13.5px] text-muted">
                Esta empresa aún no tiene usuarios en su equipo.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompanyMembersTable {
  readonly members = input.required<readonly CompanyMember[]>();
  readonly changeRole = output<CompanyMember>();
  readonly remove = output<CompanyMember>();

  protected readonly headers = ['Usuario', 'Rol interno', 'Cuenta', 'Desde', ''];

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
