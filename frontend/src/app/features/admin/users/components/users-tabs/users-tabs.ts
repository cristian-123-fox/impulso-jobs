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
 *
 * Son pestañas subrayadas y no botones en pastilla: van pegadas sobre la
 * tarjeta del listado, así que el subrayado las une visualmente a la tabla que
 * filtran en lugar de leerse como un grupo de acciones suelto.
 */
@Component({
  selector: 'app-users-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: { class: 'block' },
  template: `
    <!--
      overflow-y-hidden es obligatorio junto a overflow-x-auto: CSS fuerza
      overflow-y:auto cuando el otro eje no es visible, y el -mb-px del
      subrayado deja el contenido 1px más alto que la caja, así que Chrome
      sacaba una barra de desplazamiento vertical al lado de las pestañas.
    -->
    <div role="tablist" class="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
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
    // `-mb-px` monta el subrayado sobre el borde del contenedor, para que la
    // pestaña activa lo tape en vez de dibujar dos líneas de 1px pegadas.
    const base =
      'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 ' +
      '-mb-px text-[13.5px] font-bold transition-colors';
    return role === this.active()
      ? `${base} border-brand text-brand-strong`
      : `${base} border-transparent text-muted hover:text-ink-900`;
  }

  protected badgeClass(role: Role): string {
    const base = 'rounded-full px-2 py-0.5 text-[11.5px] font-extrabold';
    return role === this.active()
      ? `${base} bg-brand-50 text-brand-strong`
      : `${base} bg-surface text-muted`;
  }
}
