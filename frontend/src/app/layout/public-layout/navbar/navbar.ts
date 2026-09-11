import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
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

/** Identidad pintada en el navbar cuando hay sesión (T27). */
interface AccountSummary {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly photo: string | null;
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
 *
 * **Sesión y SSR (T27).** El servidor no tiene sesión, así que pinta el estado
 * anónimo; el cliente la lee de `localStorage` y la completa con `/auth/me`.
 * Para que la hidratación no encuentre un DOM distinto al servido, la sesión
 * no se muestra hasta `afterNextRender` (`hydrated`), y el hueco de la cuenta
 * reserva su ancho para que el cambio no mueva el resto de la barra.
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IjLogo, IjIcon, IjButton],
  // El host sustituye al `<header>` que envolvía el contenido: sin él, el
  // portal se quedaba sin landmark `banner`.
  host: {
    role: 'banner',
    '[class]': 'hostClasses()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeUserMenu()',
  },
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
        <!-- El ancho mínimo reserva el hueco: al hidratar, "Ingresar" deja
             paso al menú de usuario sin desplazar el resto de la barra. Da
             para el disparador completo (avatar 32 + nombre 96 + chevron 14 +
             separaciones), así que el nombre más largo tampoco lo ensancha. -->
        <div class="relative flex min-w-[172px] justify-end" data-user-menu>
          @if (account(); as account) {
            <button
              type="button"
              class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[15px] font-medium text-body transition-colors hover:text-brand-strong"
              [attr.aria-expanded]="userMenuOpen()"
              aria-haspopup="menu"
              aria-controls="menu-usuario"
              (click)="toggleUserMenu()"
            >
              <span
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-50 text-[11px] font-extrabold text-brand"
              >
                @if (account.photo; as photo) {
                  <img [src]="photo" alt="" class="h-full w-full object-cover" />
                } @else {
                  {{ account.initials }}
                }
              </span>
              <!-- Truncado: el nombre completo va en el desplegable. -->
              <span class="max-w-[96px] truncate">{{ account.name }}</span>
              <ij-icon name="chevron-down" [size]="14" />
            </button>

            @if (userMenuOpen()) {
              <div
                id="menu-usuario"
                role="menu"
                class="absolute right-0 top-[calc(100%+10px)] z-40 w-[232px] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-header"
              >
                <div class="border-b border-line px-4 pb-2.5 pt-1.5">
                  <div class="truncate text-[13.5px] font-bold text-ink-900">
                    {{ account.name }}
                  </div>
                  <div class="truncate text-[12px] text-muted">{{ account.email }}</div>
                </div>
                <a
                  role="menuitem"
                  [routerLink]="account.path"
                  class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-body transition-colors hover:bg-surface"
                  (click)="closeUserMenu()"
                >
                  <ij-icon name="user" [size]="16" />
                  Ir a mi cuenta
                </a>
                <button
                  role="menuitem"
                  type="button"
                  class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-medium text-body transition-colors hover:bg-surface"
                  (click)="onLogout()"
                >
                  <ij-icon name="logout" [size]="16" />
                  Cerrar sesión
                </button>
              </div>
            }
          } @else {
            <a
              routerLink="/auth/login"
              class="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium text-body transition-colors hover:text-brand-strong"
            >
              <ij-icon name="login" [size]="15" />
              Ingresar
            </a>
          }
        </div>
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
        @if (account(); as account) {
          <div class="mb-3 flex items-center gap-3 border-b border-line pb-4">
            <span
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-50 text-[12px] font-extrabold text-brand"
            >
              @if (account.photo; as photo) {
                <img [src]="photo" alt="" class="h-full w-full object-cover" />
              } @else {
                {{ account.initials }}
              }
            </span>
            <div class="min-w-0">
              <div class="truncate text-[14px] font-bold text-ink-900">
                {{ account.name }}
              </div>
              <div class="truncate text-[12px] text-muted">{{ account.email }}</div>
            </div>
          </div>
        }
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
              class="flex items-center gap-1.5 text-[15px] font-medium text-body"
              (click)="close()"
            >
              <ij-icon name="user" [size]="15" />
              Ir a mi cuenta
            </a>
            <button
              type="button"
              class="flex items-center gap-1.5 text-[15px] font-medium text-body"
              (click)="onLogout()"
            >
              <ij-icon name="logout" [size]="15" />
              Cerrar sesión
            </button>
          } @else {
            <a
              routerLink="/auth/login"
              class="flex items-center gap-1.5 text-[15px] font-medium text-body"
              (click)="close()"
            >
              <ij-icon name="login" [size]="15" />
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly items: readonly NavItem[] = [
    { label: 'Inicio', path: '/inicio' },
    { label: 'Nosotros', path: '/nosotros' },
    { label: 'Empleos', path: '/vacantes' },
    { label: 'Planes', path: '/planes' },
    { label: 'Contacto', path: '/contacto' },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly scrolled = signal(false);

  /**
   * La sesión no existe en SSR. Mostrarla ya en el primer render del cliente
   * dejaría un DOM distinto al servido y rompería la hidratación, así que se
   * revela tras `afterNextRender`.
   */
  private readonly hydrated = signal(false);

  /** Sesión efectiva: `null` mientras no se haya hidratado. */
  private readonly sessionUser = computed(() =>
    this.hydrated() ? this.auth.currentUser() : null,
  );

  /**
   * Destino de "Publicar empleo". Antes apuntaba a `/empresa/publicar`, que no
   * existe: para un visitante el guard lo mandaba a login y para una empresa
   * caía en el comodín y acababa en `/vacantes`. Ahora una empresa con sesión
   * va a sus vacantes y cualquier otro al registro de empresa.
   */
  protected readonly postJobPath = computed(() =>
    this.sessionUser()?.role === Role.EMPLOYER
      ? '/empresa/vacantes'
      : '/auth/registro/empresa',
  );

  /** Identidad para el menú de usuario; `null` para un visitante. */
  protected readonly account = computed<AccountSummary | null>(() => {
    const user = this.sessionUser();
    if (!user) return null;
    // El nombre llega con `/auth/me`; hasta entonces (o si falla) el correo.
    const name = user.displayName?.trim() || user.email;
    return {
      name,
      email: user.email,
      initials: initialsOf(name),
      photo: user.avatarUrl ?? null,
      path: this.auth.redirectUrlFor(user.role),
    };
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

    // Sólo corre en el navegador: revela la sesión y la completa con `/auth/me`.
    afterNextRender(() => {
      this.hydrated.set(true);
      this.auth.loadIdentity().subscribe();
    });

    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = new IntersectionObserver(
      ([entry]) => this.scrolled.set(entry.intersectionRatio < 1),
      { threshold: [1] },
    );
    observer.observe(host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  protected close(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  /** Cierra el desplegable al pulsar fuera de él (el disparador va dentro). */
  protected onDocumentClick(event: Event): void {
    if (!this.userMenuOpen()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-user-menu]')) return;
    this.closeUserMenu();
  }

  /** Cierra sesión sin salir de la página pública: el navbar vuelve a anónimo. */
  protected onLogout(): void {
    this.close();
    this.auth.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}

/** Iniciales para el avatar sin foto; con un correo, sus dos primeras letras. */
function initialsOf(name: string): string {
  const fromWords = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return fromWords.length > 1 ? fromWords : name.slice(0, 2).toUpperCase();
}
