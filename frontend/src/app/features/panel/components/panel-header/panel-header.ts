import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { PanelMeta, PanelRole } from '@/features/panel/models/panel.models';
import { AVATAR_GRADIENT } from '@/features/panel/panel.theme';

interface RoleTab {
  readonly key: PanelRole;
  readonly label: string;
}

/** Cabecera del panel: buscador, conmutador de rol, notificaciones y usuario. */
@Component({
  selector: 'app-panel-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: {
    class:
      'sticky top-0 z-10 flex h-[74px] items-center gap-3 border-b border-line bg-white px-4 sm:gap-[18px] sm:px-7',
  },
  template: `
    <button
      type="button"
      class="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-body transition-colors hover:text-brand"
      aria-label="Mostrar u ocultar menú"
      (click)="toggleSidebar.emit()"
    >
      <ij-icon name="menu" [size]="20" />
    </button>

    <div class="relative hidden max-w-[340px] flex-1 md:block">
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        <ij-icon name="search" [size]="17" />
      </span>
      <input
        type="search"
        placeholder="Buscar vacantes, candidatos, empresas…"
        class="h-[42px] w-full rounded-[11px] border border-line bg-surface pl-10 pr-3.5 text-[13.5px] text-ink-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>

    <div class="ml-auto flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      @for (r of roles; track r.key) {
        <button type="button" [class]="segClass(r.key)" (click)="roleChange.emit(r.key)">
          {{ r.label }}
        </button>
      }
    </div>

    <button
      type="button"
      aria-label="Notificaciones"
      class="relative flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-body"
    >
      <ij-icon name="bell" [size]="19" [strokeWidth]="1.8" />
      <span
        class="absolute right-2 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-accent-pink"
      ></span>
    </button>

    <div class="flex items-center gap-2.5 pl-1.5">
      <span
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] text-sm font-bold text-white"
        [style.background]="gradient()"
      >
        {{ meta().initials }}
      </span>
      <div class="hidden leading-tight lg:block">
        <div class="text-[13.5px] font-bold text-ink-900">{{ meta().userName }}</div>
        <div class="text-[11.5px] text-muted">{{ meta().roleLabel }}</div>
      </div>
    </div>
  `,
})
export class PanelHeader {
  readonly meta = input.required<PanelMeta>();
  readonly role = input.required<PanelRole>();
  readonly roleChange = output<PanelRole>();
  readonly toggleSidebar = output<void>();

  protected readonly roles: readonly RoleTab[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'postulante', label: 'Aspirante' },
  ];

  protected gradient(): string {
    return AVATAR_GRADIENT[this.meta().avatar];
  }

  protected segClass(key: PanelRole): string {
    const base =
      'rounded-[9px] px-2.5 py-2 text-[13px] font-bold transition-colors sm:px-3.5';
    return key === this.role()
      ? `${base} bg-brand text-white shadow-search`
      : `${base} text-muted hover:text-body`;
  }
}
