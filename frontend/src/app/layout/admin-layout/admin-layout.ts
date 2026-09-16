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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';
import {
  AppShell,
  ShellMenuItem,
  ShellNavItem,
} from '@/layout/app-shell/app-shell';
import { ReportsApi } from '@/features/admin/reports/data/reports.api';

/**
 * Área de administración. Todo el armazón —riel plegable, miga de pan, menú de
 * sesión— vive en `app-shell`, compartido con empresa y candidato; aquí sólo
 * queda lo propio del back-office: sus entradas y el contador de denuncias.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShell, RouterOutlet],
  template: `
    <app-shell
      [navItems]="navItems()"
      [menuItems]="menuItems"
      sectionLabel="ADMINISTRACIÓN"
      breadcrumbRoot="Administración"
      homeRoute="/admin/usuarios"
      roleLabel="Administrador"
      notificationsRoute="/admin/notificaciones"
      storageKey="ij-admin-sidebar"
    >
      <router-outlet />
    </app-shell>
  `,
})
export class AdminLayout {
  private readonly reportsApi = inject(ReportsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Denuncias sin resolver: alimenta el contador del riel. */
  private readonly pendingReports = signal(0);

  protected readonly navItems = computed<readonly ShellNavItem[]>(() => [
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { path: '/admin/empresas', label: 'Empresas', icon: 'building' },
    { path: '/admin/planes', label: 'Planes', icon: 'tag' },
    { path: '/admin/roles', label: 'Roles y permisos', icon: 'shield' },
    {
      path: '/admin/denuncias',
      label: 'Denuncias',
      icon: 'alert-triangle',
      badge: this.pendingReports(),
    },
  ]);

  protected readonly menuItems: readonly ShellMenuItem[] = [
    { path: '/admin/mi-cuenta', label: 'Mi cuenta', icon: 'user' },
    { path: '/admin/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ];

  constructor() {
    // Una sola petición por carga del área: sólo interesa el total, no las
    // filas (limit 1). El contador NO se refresca al resolver una denuncia
    // desde /admin/denuncias — vuelve a cuadrar al recargar. Mantenerlo vivo
    // exigiría que el listado avisara al layout, y no compensa por un número
    // que sólo orienta.
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
}
