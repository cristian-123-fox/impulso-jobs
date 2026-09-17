import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '@/core/auth/auth.service';
import { NotificationBell } from '@/shared/notifications/notification-bell';
import { IconName, IjAvatar, IjIcon, IjLogo } from '@/shared/ui';

export interface ShellNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  /** Contador en el riel. Sólo se pinta si es > 0. */
  readonly badge?: number;
  /** Enlace externo (abre en nueva pestaña) en vez de routerLink interno. */
  readonly external?: boolean;
}

/** Entrada del menú de sesión, encima de «Cerrar sesión». */
export interface ShellMenuItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/**
 * Shell de las tres áreas privadas: riel plegable + cabecera de sesión + outlet.
 *
 * Existe para que `/admin`, `/empresa` y `/candidato` sean **el mismo** shell y
 * no tres copias que se separan a la primera. Lo que cambia por área son datos
 * —entradas del riel, etiqueta de sección, rutas— y va por `input`; lo que
 * cambia de verdad (el pie del riel del candidato) entra por proyección.
 *
 * El riel se pliega a un carril de iconos y el estado vive en `localStorage`
 * bajo `storageKey`, distinta por área: plegar el back-office no tiene por qué
 * plegar el panel de la empresa. Las áreas privadas son `RenderMode.Client`
 * (ver `app.routes.server.ts`), pero la extracción de rutas evalúa el módulo en
 * Node igualmente: por eso `localStorage` va tras `isPlatformBrowser`.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    IjAvatar,
    IjLogo,
    IjIcon,
    NotificationBell,
  ],
  template: `
    <div class="flex min-h-screen bg-surface text-ink-900">
      <aside
        class="sticky top-0 hidden h-screen flex-shrink-0 flex-col gap-6 border-r border-line bg-white px-3.5 py-5 transition-[width] duration-200 lg:flex"
        [style.width.px]="expanded() ? 252 : 80"
      >
        <div class="relative flex items-center px-2" [class.justify-center]="!expanded()">
          <a
            [routerLink]="homeRoute()"
            class="flex min-w-0 items-center"
            [attr.aria-label]="'Impulso Jobs · ' + breadcrumbRoot()"
          >
            <ij-logo size="sm" [iconOnly]="!expanded()" />
          </a>
          <button
            type="button"
            [attr.aria-label]="expanded() ? 'Contraer menú' : 'Expandir menú'"
            [attr.aria-expanded]="expanded()"
            class="absolute -right-[26px] top-1 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line bg-white text-muted shadow-card transition-colors hover:border-brand/40 hover:text-brand-strong"
            (click)="toggleSidebar()"
          >
            <ij-icon
              name="chevron-left"
              [size]="13"
              [strokeWidth]="2.5"
              class="transition-transform duration-200"
              [class.rotate-180]="!expanded()"
            />
          </button>
        </div>

        <nav class="flex flex-1 flex-col gap-1">
          @if (expanded()) {
            <span class="px-3 pb-2 text-[11px] font-bold tracking-[0.09em] text-muted">
              {{ sectionLabel() }}
            </span>
          }
          @for (item of navItems(); track item.path) {
            @if (item.external) {
              <a
                [href]="item.path"
                target="_blank"
                rel="noopener"
                [title]="item.label"
                class="relative flex items-center gap-3 rounded-xl text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                [class]="expanded() ? 'px-3 py-2.5' : 'justify-center py-2.5'"
              >
                <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
                @if (expanded()) {
                  <span class="flex-1 whitespace-nowrap">{{ item.label }}</span>
                }
              </a>
            } @else {
              <a
                [routerLink]="item.path"
                routerLinkActive="!bg-brand-50 !text-brand-strong"
                [title]="item.label"
                class="relative flex items-center gap-3 rounded-xl text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                [class]="expanded() ? 'px-3 py-2.5' : 'justify-center py-2.5'"
              >
                <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
                @if (expanded()) {
                  <span class="flex-1 whitespace-nowrap">{{ item.label }}</span>
                  @if (item.badge) {
                    <span
                      class="rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-extrabold text-red-700"
                    >
                      {{ item.badge }}
                    </span>
                  }
                } @else if (item.badge) {
                  <span
                    class="absolute right-4 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-600"
                    [attr.aria-label]="item.badge + ' pendientes'"
                  ></span>
                }
              </a>
            }
          }
        </nav>

        @if (footerNavItems().length) {
          <nav class="flex flex-col gap-1 border-t border-line pt-3">
            @for (item of footerNavItems(); track item.path) {
              @if (item.external) {
                <a
                  [href]="item.path"
                  target="_blank"
                  rel="noopener"
                  [title]="item.label"
                  class="relative flex items-center gap-3 rounded-xl text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                  [class]="expanded() ? 'px-3 py-2.5' : 'justify-center py-2.5'"
                >
                  <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
                  @if (expanded()) {
                    <span class="flex-1 whitespace-nowrap">{{ item.label }}</span>
                  }
                </a>
              } @else {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="!bg-brand-50 !text-brand-strong"
                  [title]="item.label"
                  class="relative flex items-center gap-3 rounded-xl text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                  [class]="expanded() ? 'px-3 py-2.5' : 'justify-center py-2.5'"
                >
                  <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
                  @if (expanded()) {
                    <span class="flex-1 whitespace-nowrap">{{ item.label }}</span>
                  }
                </a>
              }
            }
          </nav>
        }

        <!-- Pie del riel: el candidato vuelve al portal desde aquí. -->
        <ng-content select="[shellRailFooter]" />
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line bg-white px-5 sm:px-7"
        >
          <a [routerLink]="homeRoute()" class="lg:hidden" [attr.aria-label]="breadcrumbRoot()">
            <ij-logo size="sm" [iconOnly]="true" />
          </a>
          <nav
            aria-label="Ruta de navegación"
            class="hidden items-center gap-2 text-[13px] font-semibold text-muted lg:flex"
          >
            <span>{{ breadcrumbRoot() }}</span>
            <ij-icon name="chevron-right" [size]="14" [strokeWidth]="2" />
            <span class="text-ink-900">{{ section() }}</span>
          </nav>

          <div class="ml-auto flex items-center gap-3">
            <ij-notification-bell [viewAllRoute]="notificationsRoute()" />

            <div class="relative">
              <button
                type="button"
                class="flex h-[46px] max-w-[240px] items-center gap-2.5 rounded-xl border p-1 pr-2.5 text-left transition-colors"
                [class]="
                  menuOpen() ? 'border-brand/40 bg-brand-50' : 'border-line bg-white hover:bg-surface'
                "
                [attr.aria-expanded]="menuOpen()"
                aria-haspopup="menu"
                (click)="menuOpen.set(!menuOpen())"
              >
                <ij-avatar
                  class="h-9 w-9 rounded-xl bg-brand-50 text-[12px] font-extrabold text-brand-strong"
                  [src]="avatar()"
                  [name]="name()"
                />
                <span class="hidden min-w-0 flex-1 sm:block">
                  <span class="block truncate text-[13px] font-bold text-ink-900">
                    {{ name() }}
                  </span>
                  <span class="block truncate text-[11.5px] font-semibold text-muted">
                    {{ roleLabel() }}
                  </span>
                </span>
                <ij-icon
                  name="chevron-down"
                  [size]="14"
                  [strokeWidth]="2.5"
                  class="text-muted transition-transform duration-150"
                  [class.rotate-180]="menuOpen()"
                />
              </button>

              @if (menuOpen()) {
                <button
                  type="button"
                  tabindex="-1"
                  aria-label="Cerrar menú"
                  class="fixed inset-0 z-30 cursor-default"
                  (click)="menuOpen.set(false)"
                ></button>
                <div
                  role="menu"
                  class="absolute right-0 top-[calc(100%+8px)] z-40 w-[248px] rounded-2xl border border-line bg-white p-1.5 shadow-float"
                >
                  <div class="border-b border-line px-3 pb-2.5 pt-2">
                    <p class="truncate text-[13px] font-bold text-ink-900">{{ name() }}</p>
                    @if (hasName()) {
                      <!-- Sin nombre, la línea de arriba ya es el correo. -->
                      <p class="truncate text-[11.5px] font-semibold text-muted">
                        {{ auth.currentUser()?.email }}
                      </p>
                    }
                  </div>
                  @for (item of menuItems(); track item.path) {
                    <a
                      [routerLink]="item.path"
                      role="menuitem"
                      class="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-body transition-colors hover:bg-surface hover:text-ink-900"
                      (click)="menuOpen.set(false)"
                    >
                      <ij-icon [name]="item.icon" [size]="18" [strokeWidth]="1.9" />
                      {{ item.label }}
                    </a>
                  }
                  <button
                    type="button"
                    role="menuitem"
                    class="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold text-red-700 transition-colors hover:bg-red-50"
                    (click)="onLogout()"
                  >
                    <ij-icon name="logout" [size]="18" [strokeWidth]="1.9" />
                    Cerrar sesión
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Navegación en móvil: el riel sólo existe desde lg. -->
        <nav class="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2.5 lg:hidden">
          @for (item of navItems(); track item.path) {
            @if (item.external) {
              <a
                [href]="item.path"
                target="_blank"
                rel="noopener"
                class="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface"
              >
                <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
                {{ item.label }}
              </a>
            } @else {
              <a
                [routerLink]="item.path"
                routerLinkActive="!bg-brand-50 !text-brand-strong"
                class="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface"
              >
                <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
                {{ item.label }}
              </a>
            }
          }
          @for (item of footerNavItems(); track item.path) {
            @if (item.external) {
              <a
                [href]="item.path"
                target="_blank"
                rel="noopener"
                class="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface"
              >
                <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
                {{ item.label }}
              </a>
            } @else {
              <a
                [routerLink]="item.path"
                routerLinkActive="!bg-brand-50 !text-brand-strong"
                class="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface"
              >
                <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
                {{ item.label }}
              </a>
            }
          }
        </nav>

        <main class="flex-1 overflow-y-auto p-4 sm:p-7">
          <ng-content />
        </main>
      </div>
    </div>
  `,
})
export class AppShell {
  readonly navItems = input.required<readonly ShellNavItem[]>();
  /** Items que aparecen separados al fondo del riel (p. enl. externos). */
  readonly footerNavItems = input<readonly ShellNavItem[]>([]);
  readonly menuItems = input<readonly ShellMenuItem[]>([]);
  /** Rótulo del grupo del riel: ADMINISTRACIÓN, RECLUTAMIENTO, MI CUENTA. */
  readonly sectionLabel = input.required<string>();
  /** Primer nivel de la miga de pan. */
  readonly breadcrumbRoot = input.required<string>();
  readonly homeRoute = input.required<string>();
  readonly roleLabel = input.required<string>();
  readonly notificationsRoute = input.required<string>();
  /** Clave de `localStorage` del riel plegado; una por área. */
  readonly storageKey = input.required<string>();
  /**
   * Nombre e imagen a pintar. Por defecto los de la sesión (`GET /auth/me`);
   * el candidato los sobrescribe con su ficha, que es la que él edita y la que
   * se actualiza al instante al cambiarla.
   */
  readonly displayName = input<string>('');
  readonly avatarUrl = input<string | null>(null);

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly menuOpen = signal(false);

  /**
   * `linkedSignal` y no `signal`: `storageKey` es un input y no está asignado
   * cuando se construye la clase, así que el valor inicial no se puede leer en
   * el constructor. Así se resuelve en el primer render —con los inputs ya
   * puestos— y los cambios del usuario sobreviven, que es lo que hace falta.
   */
  protected readonly expanded = linkedSignal<string, boolean>({
    source: () => this.storageKey(),
    computation: (key) => this.readExpanded(key),
  });

  protected readonly name = computed(() => {
    const own = this.displayName().trim();
    if (own) return own;
    const user = this.auth.currentUser();
    return user?.displayName?.trim() || user?.email || '';
  });

  /**
   * Igual que `name`: el área puede imponer la suya (el candidato usa la de su
   * ficha) y si no, manda la de la sesión. Sin este respaldo, admin y empresa
   * se quedaban en las iniciales aunque el titular tuviera foto subida.
   */
  protected readonly avatar = computed(
    () => this.avatarUrl() ?? this.auth.currentUser()?.avatarUrl ?? null,
  );

  /** `name` cae al correo cuando la cuenta no tiene nombre propio. */
  protected readonly hasName = computed(
    () => this.name() !== this.auth.currentUser()?.email,
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Segundo nivel de la miga de pan. Sale del riel y del menú de sesión, que
   * entre los dos cubren todas las rutas del área; se busca la coincidencia
   * más larga para que `/empresa/vacantes/nueva` no se quede en «Vacantes» por
   * casualidad de orden.
   */
  protected readonly section = computed(() => {
    const url = this.url();
    const candidates = [...this.navItems(), ...this.menuItems()]
      .filter((item) => url.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length);
    return candidates[0]?.label ?? this.breadcrumbRoot();
  });

  protected toggleSidebar(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey(), next ? 'expanded' : 'collapsed');
    } catch {
      // Modo privado o almacenamiento lleno: el riel funciona sin recordar.
    }
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl('/auth/login'));
  }

  private readExpanded(key: string): boolean {
    if (!this.isBrowser) return true;
    try {
      return localStorage.getItem(key) !== 'collapsed';
    } catch {
      return true;
    }
  }
}
