import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/company/team/models/team.models';

const ROLE_BADGE: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'bg-brand-50 text-brand',
  [CompanyMemberRole.ADMIN]: 'bg-accent-blue-soft text-accent-blue',
  [CompanyMemberRole.RECRUITER]: 'bg-accent-green-soft text-accent-green',
  [CompanyMemberRole.MEMBER]: 'bg-surface text-muted',
};

export type TeamAction = 'role' | 'remove';

export interface TeamActionEvent {
  action: TeamAction;
  member: CompanyMember;
}

/** Equipo de la empresa y su rol interno. Presentacional. */
@Component({
  selector: 'app-team-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[760px] border-collapse text-left">
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
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-ink-900">
                      {{ member.email }}
                    </div>
                    @if (member.userId === currentUserId()) {
                      <div class="text-[12px] text-muted">Tu cuenta</div>
                    }
                  </div>
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
                <span
                  class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                  [class]="
                    member.status === 'ACTIVE'
                      ? 'bg-accent-green-soft text-accent-green'
                      : 'bg-surface text-muted'
                  "
                >
                  {{ member.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ member.lastLogin ? (member.lastLogin | date: 'dd MMM yyyy') : 'Nunca' }}
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ member.joinedAt | date: 'dd MMM yyyy' }}
              </td>
              <td class="px-5 py-3.5">
                @if (canManage()) {
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Cambiar rol interno"
                      aria-label="Cambiar rol interno"
                      (click)="emit('role', member)"
                    >
                      <ij-icon name="pen" [size]="15" />
                    </button>
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-body"
                      [title]="
                        member.userId === currentUserId()
                          ? 'No puedes quitarte a ti mismo'
                          : 'Quitar del equipo'
                      "
                      aria-label="Quitar del equipo"
                      [disabled]="member.userId === currentUserId()"
                      (click)="emit('remove', member)"
                    >
                      <ij-icon name="x" [size]="16" />
                    </button>
                  </div>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="px-5 py-10 text-center text-[13.5px] text-muted">
                Tu equipo aún no tiene usuarios.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TeamTable {
  readonly members = input.required<readonly CompanyMember[]>();
  readonly currentUserId = input<string | null>(null);
  readonly canManage = input(false);
  readonly action = output<TeamActionEvent>();

  protected readonly headers = [
    'Usuario',
    'Rol interno',
    'Cuenta',
    'Último acceso',
    'Se unió',
    '',
  ];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand';

  protected roleLabel(role: CompanyMemberRole): string {
    return COMPANY_MEMBER_ROLE_LABELS[role] ?? role;
  }

  protected roleBadge(role: CompanyMemberRole): string {
    return ROLE_BADGE[role] ?? ROLE_BADGE[CompanyMemberRole.MEMBER];
  }

  protected initials(email: string): string {
    return email.slice(0, 2).toUpperCase();
  }

  protected emit(action: TeamAction, member: CompanyMember): void {
    this.action.emit({ action, member });
  }
}
