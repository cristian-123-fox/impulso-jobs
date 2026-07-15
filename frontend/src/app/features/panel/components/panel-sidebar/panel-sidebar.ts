import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IjIcon, IjLogo } from '@/shared/ui';
import { PanelMeta, PanelNavItem } from '@/features/panel/models/panel.models';
import { AVATAR_GRADIENT } from '@/features/panel/panel.theme';

/**
 * Barra lateral del panel. En escritorio es una columna fija que anima su ancho
 * entre expandida (262px, iconos + textos) y colapsada (76px, solo iconos). En
 * móvil es un drawer superpuesto que entra/sale con `translate-x`. Como el único
 * estado "cerrado pero visible" ocurre en escritorio (riel), se puede alternar
 * el contenido con `@if (open())` sin media queries.
 */
@Component({
  selector: 'app-panel-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjLogo],
  host: { '[class]': 'hostClass()' },
  template: `
    <!-- Cabecera / logo -->
    <div
      class="flex h-[74px] flex-shrink-0 items-center border-b border-line"
      [class]="open() ? 'justify-between px-[22px]' : 'justify-center px-0'"
    >
      @if (open()) {
        <ij-logo size="sm" />
        <button
          type="button"
          class="text-muted transition-colors hover:text-body lg:hidden"
          aria-label="Cerrar menú"
          (click)="close.emit()"
        >
          <ij-icon name="close" [size]="22" />
        </button>
      } @else {
        <span class="relative block h-8 w-[26px] rounded-b rounded-t-[13px] bg-brand" aria-hidden="true">
          <span class="absolute left-1/2 top-[6px] block h-2 w-2 -translate-x-1/2 rounded-full bg-white"></span>
        </span>
      }
    </div>

    @if (open()) {
      <div class="px-4 pb-2 pt-[18px]">
        <span class="pl-2.5 text-[11px] font-bold tracking-[1px] text-muted">
          {{ meta().section }}
        </span>
      </div>
    } @else {
      <div class="pt-[18px]"></div>
    }

    <nav class="flex flex-1 flex-col gap-[3px] overflow-y-auto px-3 pb-5">
      @for (item of navItems(); track item.key) {
        <button
          type="button"
          [class]="itemClass(item.key)"
          [attr.title]="open() ? null : item.label"
          (click)="navigate.emit(item.key)"
        >
          <span class="flex-shrink-0" [class]="item.key === activeKey() ? 'text-brand' : 'text-muted'">
            <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
          </span>
          @if (open()) {
            <span
              class="flex-1 whitespace-nowrap text-left text-[13.5px]"
              [class]="item.key === activeKey() ? 'font-bold text-brand' : 'font-semibold text-body'"
            >
              {{ item.label }}
            </span>
            @if (item.badge) {
              <span [class]="badgeClass(item.key)">{{ item.badge }}</span>
            }
          } @else if (item.badge) {
            <span
              class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              [class]="item.key === activeKey() ? 'bg-brand' : 'bg-brand/50'"
            ></span>
          }
        </button>
      }
    </nav>

    <div class="flex-shrink-0 border-t border-line p-4">
      @if (open()) {
        <div class="flex items-center gap-3 rounded-xl bg-surface p-2.5">
          <span
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
            [style.background]="gradient()"
          >
            {{ meta().initials }}
          </span>
          <div class="min-w-0">
            <div class="truncate text-[13.5px] font-bold text-ink-900">{{ meta().userName }}</div>
            <div class="text-[11.5px] text-muted">{{ meta().roleLabel }}</div>
          </div>
        </div>
      } @else {
        <div
          class="mx-auto flex h-10 w-10 items-center justify-center rounded-[11px] text-sm font-bold text-white"
          [style.background]="gradient()"
          [attr.title]="meta().userName"
        >
          {{ meta().initials }}
        </div>
      }
    </div>
  `,
})
export class PanelSidebar {
  readonly meta = input.required<PanelMeta>();
  readonly navItems = input.required<readonly PanelNavItem[]>();
  readonly activeKey = input.required<string>();
  readonly open = input.required<boolean>();
  readonly navigate = output<string>();
  readonly close = output<void>();

  protected hostClass(): string {
    const base =
      'fixed inset-y-0 left-0 z-40 flex w-[262px] flex-shrink-0 flex-col overflow-hidden ' +
      'border-r border-line bg-white transition-[transform,width] duration-300 ease-out ' +
      'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0';
    return this.open()
      ? `${base} translate-x-0 lg:w-[262px]`
      : `${base} -translate-x-full lg:w-[76px]`;
  }

  protected gradient(): string {
    return AVATAR_GRADIENT[this.meta().avatar];
  }

  protected itemClass(key: string): string {
    const base = 'relative flex w-full items-center rounded-[11px] py-[11px] transition-colors';
    const layout = this.open() ? ' gap-3 px-3 text-left' : ' justify-center px-0';
    const state = key === this.activeKey() ? ' bg-brand-50' : ' hover:bg-surface';
    return base + layout + state;
  }

  protected badgeClass(key: string): string {
    const base = 'rounded-full px-2 py-0.5 text-[11px] font-bold';
    return key === this.activeKey()
      ? `${base} bg-brand text-white`
      : `${base} bg-brand-50 text-brand`;
  }
}
