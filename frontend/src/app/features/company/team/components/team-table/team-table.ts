import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjAvatar, IjIcon } from '@/shared/ui';
import {
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
} from '@/features/company/team/models/team.models';

const ROLE_BADGE: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'bg-brand-50 text-brand-strong',
  [CompanyMemberRole.ADMIN]: 'bg-accent-blue-soft text-accent-blue-strong',
  [CompanyMemberRole.RECRUITER]:
    'bg-accent-green-soft text-accent-green-strong',
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
  imports: [DatePipe, IjAvatar, IjIcon],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[860px] border-collapse text-left">
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
          @for (member of members(); track member.userId) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <ij-avatar
                    class="h-9 w-9 rounded-xl text-[13px] font-bold"
                    [class]="roleBadge(member.companyRole)"
                    [src]="member.photoUrl"
                    [name]="member.displayName || member.email"
                  />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="truncate text-sm font-semibold text-ink-900">
                        {{ member.displayName || member.email }}
                      </span>
                      @if (member.userId === currentUserId()) {
                        <span
                          class="flex-none rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted"
                        >
                          Tú
                        </span>
                      }
                    </div>
                    @if (secondary(member); as line) {
                      <div class="truncate text-[12.5px] text-muted">{{ line }}</div>
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
                @if (member.accessRole; as access) {
                  <span
                    class="inline-flex items-center gap-1 rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-accent-amber-strong"
                    title="Sus permisos están limitados por este rol"
                  >
                    {{ access.name }}
                  </span>
                } @else {
                  <span class="text-[12.5px] font-semibold text-muted">Acceso completo</span>
                }
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
                      title="Cambiar rol y permisos"
                      aria-label="Cambiar rol y permisos"
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
              <td colspan="7" class="px-5 py-10 text-center text-[13.5px] text-muted">
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
    'Permisos',
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

  /** Correo y puesto bajo el nombre; sin nombre, el correo ya está arriba. */
  protected secondary(member: CompanyMember): string {
    return [member.displayName ? member.email : '', member.jobTitle ?? '']
      .filter(Boolean)
      .join(' · ');
  }

  protected emit(action: TeamAction, member: CompanyMember): void {
    this.action.emit({ action, member });
  }
}
