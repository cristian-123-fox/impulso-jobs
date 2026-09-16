import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { catchError, filter, map, of } from 'rxjs';
import { AuthService } from '@/core/auth/auth.service';
import { NotificationBell } from '@/shared/notifications/notification-bell';
import { IconName, IjIcon, IjLogo } from '@/shared/ui';
import { ReportsApi } from '@/features/admin/reports/data/reports.api';

interface AdminNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/** Clave del riel plegado. Se recuerda entre sesiones, como el resto del kit. */
const SIDEBAR_KEY = 'ij-admin-sidebar';

/**
 * Shell del área de administración: riel plegable + cabecera de sesión + outlet.
 *
 * El riel se pliega a un carril de iconos y el estado vive en `localStorage`,
 * así que sobrevive a navegar y a recargar. `/admin/**` es `RenderMode.Client`
 * (ver `app.routes.server.ts`), pero la extracción de rutas evalúa el módulo en
 * Node igualmente: por eso `localStorage` va tras `isPlatformBrowser`.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
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
            routerLink="/admin/usuarios"
            class="flex min-w-0 items-center"
            aria-label="Impulso Jobs · Administración"
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

        <nav class="flex flex-col gap-1">
          @if (expanded()) {
            <span class="px-3 pb-2 text-[11px] font-bold tracking-[0.09em] text-muted">
              ADMINISTRACIÓN
            </span>
          }
          @for (item of navItems; track item.path) {
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
                @if (item.path === reportsPath && pendingReports() > 0) {
                  <span
                    class="rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-extrabold text-red-700"
                  >
                    {{ pendingReports() }}
                  </span>
                }
              } @else if (item.path === reportsPath && pendingReports() > 0) {
                <span
                  class="absolute right-4 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-600"
                  [attr.aria-label]="pendingReports() + ' denuncias pendientes'"
                ></span>
              }
            </a>
          }
        </nav>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line bg-white px-5 sm:px-7"
        >
          <a routerLink="/admin/usuarios" class="lg:hidden" aria-label="Administración">
            <ij-logo size="sm" [iconOnly]="true" />
          </a>
          <nav
            aria-label="Ruta de navegación"
            class="hidden items-center gap-2 text-[13px] font-semibold text-muted lg:flex"
          >
            <span>Administración</span>
            <ij-icon name="chevron-right" [size]="14" [strokeWidth]="2" />
            <span class="text-ink-900">{{ section() }}</span>
          </nav>

          <div class="ml-auto flex items-center gap-3">
            <ij-notification-bell viewAllRoute="/admin/notificaciones" />

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
                <span
                  class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[12px] font-extrabold text-brand-strong"
                >
                  {{ initials() }}
                </span>
                <span class="hidden min-w-0 flex-1 sm:block">
                  <span class="block truncate text-[13px] font-bold text-ink-900">
                    {{ displayName() }}
                  </span>
                  <span class="block truncate text-[11.5px] font-semibold text-muted">
                    Administrador
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
                    <p class="truncate text-[13px] font-bold text-ink-900">
                      {{ displayName() }}
                    </p>
                    @if (hasName()) {
                      <!-- Sin nombre, la línea de arriba ya es el correo. -->
                      <p class="truncate text-[11.5px] font-semibold text-muted">
                        {{ auth.currentUser()?.email }}
                      </p>
                    }
                  </div>
                  <a
                    routerLink="/admin/notificaciones"
                    role="menuitem"
                    class="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-body transition-colors hover:bg-surface hover:text-ink-900"
                    (click)="menuOpen.set(false)"
                  >
                    <ij-icon name="bell" [size]="18" [strokeWidth]="1.9" />
                    Notificaciones
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold text-red-700 transition-colors hover:bg-red-50"
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
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-brand-50 !text-brand-strong"
              class="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface"
            >
              <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
              {{ item.label }}
            </a>
          }
        </nav>

        <main class="flex-1 overflow-y-auto p-4 sm:p-7">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly reportsApi = inject(ReportsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly navItems: readonly AdminNavItem[] = [
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { path: '/admin/empresas', label: 'Empresas', icon: 'building' },
    { path: '/admin/planes', label: 'Planes', icon: 'tag' },
    { path: '/admin/roles', label: 'Roles y permisos', icon: 'shield' },
    { path: '/admin/denuncias', label: 'Denuncias', icon: 'alert-triangle' },
  ];

  /** La única entrada con contador; se compara por ruta, no por posición. */
  protected readonly reportsPath = '/admin/denuncias';

  protected readonly expanded = signal(this.readExpanded());
  protected readonly menuOpen = signal(false);
  /** Denuncias sin resolver: alimenta el contador del riel. */
  protected readonly pendingReports = signal(0);

  /** URL activa, para resolver la miga de pan. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly section = computed(() => {
    const url = this.url();
    const item = this.navItems.find((nav) => url.startsWith(nav.path));
    if (item) return item.label;
    return url.startsWith('/admin/notificaciones') ? 'Notificaciones' : 'Panel';
  });

  protected readonly displayName = computed(() => {
    const user = this.auth.currentUser();
    return user?.displayName?.trim() || user?.email || 'Administrador';
  });

  /** `displayName` cae al correo cuando la cuenta no tiene nombre propio. */
  protected readonly hasName = computed(
    () => this.displayName() !== this.auth.currentUser()?.email,
  );

  protected readonly initials = computed(() => {
    const parts = this.displayName().split(/[\s@._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? 'A') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  constructor() {
    // Una sola petición por carga del área: sólo interesa el total, no las
    // filas (`limit: 1`). El contador NO se refresca al resolver una denuncia
    // desde `/admin/denuncias` — vuelve a cuadrar al recargar. Mantenerlo vivo
    // exigiría que el listado de denuncias avisara al layout, y no compensa
    // por un número que sólo orienta.
    if (this.isBrowser) {
      this.reportsApi
        .list(1, 1, 'PENDING')
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((page) => this.pendingReports.set(page?.total ?? 0));
    }
  }

  protected toggleSidebar(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'expanded' : 'collapsed');
    } catch {
      // Modo privado o almacenamiento lleno: el riel funciona igual sin recordar.
    }
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl('/auth/login'));
  }

  private readExpanded(): boolean {
    if (!this.isBrowser) return true;
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== 'collapsed';
    } catch {
      return true;
    }
  }
}
