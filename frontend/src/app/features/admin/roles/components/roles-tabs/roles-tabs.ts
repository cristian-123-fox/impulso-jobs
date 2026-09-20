import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  ADMINISTRABLE_SCOPES,
  ROLE_SCOPE_META,
  RoleScope,
  RoleScopeMeta,
} from '@/features/admin/roles/models/roles.models';

/**
 * Separa los roles por a quién sirven. Un rol de back-office y uno de empresa
 * no comparten ni permisos ni criterio: mezclarlos en una sola lista obligaba a
 * leer el código del rol para saber de qué se estaba hablando.
 *
 * El aspirante no tiene pestaña a propósito: sus permisos están fijados en el
 * backend, así que no hay nada que administrar aquí.
 *
 * Pestañas subrayadas, como en `/admin/usuarios`: van pegadas sobre la tarjeta
 * del listado y el subrayado las une a la tabla que filtran.
 */
@Component({
  selector: 'app-roles-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: { class: 'block' },
  template: `
    <!--
      overflow-y-hidden junto a overflow-x-auto: CSS fuerza overflow-y:auto
      cuando el otro eje no es visible, y el -mb-px del subrayado deja el
      contenido 1px más alto que la caja.
    -->
    <div role="tablist" class="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
      @for (tab of tabs; track tab.scope) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab.scope === active()"
          [class]="tabClass(tab.scope)"
          (click)="select.emit(tab.scope)"
        >
          <ij-icon [name]="tab.icon" [size]="17" [strokeWidth]="1.9" />
          <span>{{ tab.label }}</span>
          <span [class]="badgeClass(tab.scope)">{{ counts()[tab.scope] ?? 0 }}</span>
        </button>
      }
    </div>
  `,
})
export class RolesTabs {
  readonly active = input.required<RoleScope>();
  /** Cuántos roles hay en cada ámbito. */
  readonly counts = input.required<Partial<Record<RoleScope, number>>>();
  readonly select = output<RoleScope>();

  protected readonly tabs: readonly RoleScopeMeta[] = ADMINISTRABLE_SCOPES.map(
    (scope) => ROLE_SCOPE_META[scope],
  );

  protected tabClass(scope: RoleScope): string {
    // `-mb-px` monta el subrayado sobre el borde del contenedor, para que la
    // pestaña activa lo tape en vez de dibujar dos líneas de 1px pegadas.
    const base =
      'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 ' +
      '-mb-px text-[13.5px] font-bold transition-colors';
    return scope === this.active()
      ? `${base} border-brand text-brand-strong`
      : `${base} border-transparent text-muted hover:text-ink-900`;
  }

  protected badgeClass(scope: RoleScope): string {
    const base = 'rounded-full px-2 py-0.5 text-[11.5px] font-extrabold';
    return scope === this.active()
      ? `${base} bg-brand-50 text-brand-strong`
      : `${base} bg-surface text-muted`;
  }
}
