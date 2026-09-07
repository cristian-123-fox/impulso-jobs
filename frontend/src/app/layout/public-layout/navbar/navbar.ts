import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '@/core/auth/auth.service';
import { Role } from '@/core/models/role.enum';
import { IjButton, IjIcon, IjLogo } from '@/shared/ui';

interface NavItem {
  readonly label: string;
  readonly path: string;
}

/**
 * Barra de navegación del portal público. El host es `sticky`: arriba del todo
 * se integra con el hero (fondo `surface`) y, al hacer scroll, cambia a fondo
 * blanco con sombra y una animación de entrada (slide-down).
 *
 * El estado "con scroll" no se calcula con un listener de `scroll`: eso corre
 * en cada frame y, con zone.js, dispara detección de cambios en toda la app.
 * Se usa el truco del sticky observado: con `top: -1px`, el propio header deja
 * de intersecar al 100% justo cuando se pega, así que un `IntersectionObserver`
 * con `threshold: 1` da el estado sin coste por frame.
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IjLogo, IjIcon, IjButton],
  // El host sustituye al `<header>` que envolvía el contenido: sin él, el
  // portal se quedaba sin landmark `banner`.
  host: { role: 'banner', '[class]': 'hostClasses()' },
  template: `
    <!-- h-[72px] de contenido + separadores: dentro del tope de 80px. -->
    <div
      class="mx-auto flex max-w-container items-center justify-between gap-6 px-6 py-4 lg:px-[60px]"
    >
      <a routerLink="/inicio" aria-label="Impulso Jobs, ir al inicio">
        <ij-logo />
      </a>

      <!-- Navegación (desktop) -->
      <nav
        class="hidden items-center gap-7 text-[15px] font-medium text-body xl:gap-8 lg:flex"
        aria-label="Principal"
      >
        @for (item of items; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="text-brand-strong"
            class="whitespace-nowrap transition-colors hover:text-brand-strong"
          >
            {{ item.label }}
          </a>
        }
      </nav>

      <!-- Acciones (desktop) -->
      <div class="hidden items-center gap-5 lg:flex">
        @if (account(); as account) {
          <a
            [routerLink]="account.path"
            class="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium text-body transition-colors hover:text-brand-strong"
          >
            <ij-icon name="user" [size]="15" />
            {{ account.label }}
          </a>
        } @else {
          <a
            routerLink="/auth/login"
            class="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium text-body transition-colors hover:text-brand-strong"
          >
            <ij-icon name="login" [size]="15" />
            Ingresar
          </a>
        }
        <a ij-button [routerLink]="postJobPath()" size="sm">
          <ij-icon name="plus" [size]="14" />
          Publicar empleo
        </a>
      </div>

      <!-- Toggle móvil -->
      <button
        type="button"
        class="-mr-2 rounded-lg p-2 text-ink-900 transition-colors hover:bg-surface lg:hidden"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="nav-movil"
        [attr.aria-label]="menuOpen() ? 'Cerrar menú' : 'Abrir menú'"
        (click)="toggle()"
      >
        <ij-icon [name]="menuOpen() ? 'close' : 'menu'" [size]="24" />
      </button>
    </div>

    <!-- Menú móvil -->
    @if (menuOpen()) {
      <nav
        id="nav-movil"
        class="flex flex-col gap-1 border-t border-line bg-white px-6 py-4 lg:hidden"
        aria-label="Principal"
      >
        @for (item of items; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="text-brand-strong"
            class="rounded-lg py-2.5 text-[15px] font-medium text-body"
            (click)="close()"
          >
            {{ item.label }}
          </a>
        }
        <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          @if (account(); as account) {
            <a
              [routerLink]="account.path"
              class="text-[15px] font-medium text-body"
              (click)="close()"
            >
              {{ account.label }}
            </a>
          } @else {
            <a
              routerLink="/auth/login"
              class="text-[15px] font-medium text-body"
              (click)="close()"
            >
              Ingresar
            </a>
          }
          <a ij-button [routerLink]="postJobPath()" size="sm" (click)="close()">
            <ij-icon name="plus" [size]="14" />
            Publicar empleo
          </a>
        </div>
      </nav>
    }
  `,
})
export class Navbar {
  private readonly auth = inject(AuthService);

  protected readonly items: readonly NavItem[] = [
    { label: 'Inicio', path: '/inicio' },
    { label: 'Nosotros', path: '/nosotros' },
    { label: 'Empleos', path: '/vacantes' },
    { label: 'Planes', path: '/planes' },
    { label: 'Contacto', path: '/contacto' },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  /**
   * Destino de "Publicar empleo". Antes apuntaba a `/empresa/publicar`, que no
   * existe: para un visitante el guard lo mandaba a login y para una empresa
   * caía en el comodín y acababa en `/vacantes`. Ahora una empresa con sesión
   * va a sus vacantes y cualquier otro al registro de empresa.
   */
  protected readonly postJobPath = computed(() =>
    this.auth.currentUser()?.role === Role.EMPLOYER
      ? '/empresa/vacantes'
      : '/auth/registro/empresa',
  );

  /** Enlace al área propia cuando hay sesión; `null` para un visitante. */
  protected readonly account = computed(() => {
    const user = this.auth.currentUser();
    return user
      ? { label: 'Mi cuenta', path: this.auth.redirectUrlFor(user.role) }
      : null;
  });

  protected readonly hostClasses = computed(() => {
    // `top-[-1px]` es lo que hace observable el estado "pegado" (ver doc arriba).
    const base = 'sticky top-[-1px] z-30 block transition-colors duration-300';
    return this.scrolled()
      ? `${base} animate-header-down bg-white shadow-header`
      : `${base} bg-surface`;
  });

  constructor() {
    const router = inject(Router);
    // Navegar con el menú móvil abierto lo dejaba abierto sobre la página nueva.
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close());

    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = new IntersectionObserver(
      ([entry]) => this.scrolled.set(entry.intersectionRatio < 1),
      { threshold: [1] },
    );
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  protected close(): void {
    this.menuOpen.set(false);
  }
}
