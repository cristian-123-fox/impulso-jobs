import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IjButton, IjIcon, IjLogo } from '@/shared/ui';

interface NavItem {
  readonly label: string;
  readonly path: string;
}

/**
 * Barra de navegación del portal público. El host es `sticky`: arriba del todo
 * se integra con el hero (fondo `surface`) y, al hacer scroll, cambia a fondo
 * blanco con sombra y una animación de entrada (slide-down).
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IjLogo, IjIcon, IjButton],
  host: { '[class]': 'hostClasses()' },
  template: `
    <header>
      <div
        class="mx-auto flex max-w-container items-center justify-between px-6 py-5 lg:px-[60px]"
      >
        <a routerLink="/" aria-label="Impulso Jobs — inicio">
          <ij-logo />
        </a>

        <!-- Navegación (desktop) -->
        <nav
          class="hidden items-center gap-8 text-[15px] font-medium text-body lg:flex"
        >
          @for (item of items; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-brand"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              class="transition-colors hover:text-brand"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- Acciones (desktop) -->
        <div class="hidden items-center gap-5 lg:flex">
          <button
            type="button"
            class="text-body transition-colors hover:text-brand"
            aria-label="Buscar"
          >
            <ij-icon name="search" [size]="18" />
          </button>
          <a
            routerLink="/auth/login"
            class="flex items-center gap-1.5 text-[15px] font-medium text-body transition-colors hover:text-brand"
          >
            <ij-icon name="login" [size]="15" />
            Ingresar
          </a>
          <a ij-button routerLink="/empresa/publicar" size="sm">
            <ij-icon name="plus" [size]="14" />
            Publicar empleo
          </a>
        </div>

        <!-- Toggle móvil -->
        <button
          type="button"
          class="text-ink-900 lg:hidden"
          [attr.aria-expanded]="menuOpen()"
          aria-label="Abrir menú"
          (click)="toggle()"
        >
          <ij-icon [name]="menuOpen() ? 'close' : 'menu'" [size]="24" />
        </button>
      </div>

      <!-- Menú móvil -->
      @if (menuOpen()) {
        <nav
          class="flex flex-col gap-1 border-t border-line bg-white px-6 py-4 lg:hidden"
        >
          @for (item of items; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-brand"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              class="py-2 text-[15px] font-medium text-body"
              (click)="close()"
            >
              {{ item.label }}
            </a>
          }
          <div class="mt-3 flex items-center gap-3">
            <a
              routerLink="/auth/login"
              class="text-[15px] font-medium text-body"
              (click)="close()"
            >
              Ingresar
            </a>
            <a
              ij-button
              routerLink="/empresa/publicar"
              size="sm"
              (click)="close()"
            >
              <ij-icon name="plus" [size]="14" />
              Publicar empleo
            </a>
          </div>
        </nav>
      }
    </header>
  `,
})
export class Navbar {
  protected readonly items: readonly NavItem[] = [
    { label: 'Inicio', path: '/' },
    { label: 'Nosotros', path: '/nosotros' },
    { label: 'Empleos', path: '/vacantes' },
    { label: 'Empresas', path: '/empresa' },
    // { label: 'Candidatos', path: '/candidato' },
    { label: 'Planes', path: '/planes' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contacto', path: '/contacto' },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly hostClasses = computed(() => {
    const base = 'sticky top-0 z-30 block transition-colors duration-300';
    return this.scrolled()
      ? `${base} animate-header-down bg-white shadow-header`
      : `${base} bg-surface`;
  });

  /** El evento de scroll no se dispara en SSR, así que es seguro leer window aquí. */
  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  protected toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  protected close(): void {
    this.menuOpen.set(false);
  }
}
