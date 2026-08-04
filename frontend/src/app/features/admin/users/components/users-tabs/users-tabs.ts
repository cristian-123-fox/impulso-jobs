import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Role } from '@/core/models/role.enum';
import { IconName, IjIcon } from '@/shared/ui';
import { UserStats } from '@/features/admin/users/models/users.models';

interface UserTab {
  readonly role: Role;
  readonly label: string;
  readonly icon: IconName;
  /** Clave del contador dentro de `UserStats`. */
  readonly countKey: keyof UserStats;
}

/**
 * Separa el listado por tipo de cuenta. La pestaña activa es el filtro de rol,
 * por eso la barra de filtros ya no lo repite.
 */
@Component({
  selector: 'app-users-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: { class: 'block' },
  template: `
    <div
      role="tablist"
      class="flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card"
    >
      @for (tab of tabs; track tab.role) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab.role === active()"
          [class]="tabClass(tab.role)"
          (click)="select.emit(tab.role)"
        >
          <ij-icon [name]="tab.icon" [size]="17" [strokeWidth]="1.9" />
          <span>{{ tab.label }}</span>
          <span [class]="badgeClass(tab.role)">{{ stats()[tab.countKey] }}</span>
        </button>
      }
    </div>
  `,
})
export class UsersTabs {
  readonly active = input.required<Role>();
  readonly stats = input.required<UserStats>();
  readonly select = output<Role>();

  protected readonly tabs: readonly UserTab[] = [
    {
      role: Role.EMPLOYER,
      label: 'Empresas',
      icon: 'building',
      countKey: 'employers',
    },
    {
      role: Role.CANDIDATE,
      label: 'Aspirantes',
      icon: 'user',
      countKey: 'candidates',
    },
    {
      role: Role.ADMIN,
      label: 'Personal administrativo',
      icon: 'shield',
      countKey: 'admins',
    },
  ];

  protected tabClass(role: Role): string {
    const base =
      'flex flex-1 min-w-fit items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 ' +
      'text-[13.5px] font-bold transition-colors';
    return role === this.active()
      ? `${base} bg-brand text-white`
      : `${base} text-body hover:bg-surface`;
  }

  protected badgeClass(role: Role): string {
    const base = 'rounded-full px-2 py-0.5 text-[11.5px] font-bold';
    return role === this.active()
      ? `${base} bg-white/25 text-white`
      : `${base} bg-surface text-muted`;
  }
}
