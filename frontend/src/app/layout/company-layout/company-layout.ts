import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  AppShell,
  ShellMenuItem,
  ShellNavItem,
} from '@/layout/app-shell/app-shell';
import { environment } from '@env';

/**
 * Área de empresa. El armazón es `app-shell`, el mismo que admin y candidato.
 *
 * El nombre que pinta la cabecera es el **comercial** (`GET /auth/me` resuelve
 * `companies.business_name` para un EMPLOYER): aquí se actúa en representación
 * de la empresa. La foto sí es la personal, si el titular subió una.
 */
@Component({
  selector: 'app-company-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShell, RouterOutlet],
  template: `
    <app-shell
      [navItems]="navItems"
      [footerNavItems]="footerNavItems"
      [menuItems]="menuItems"
      sectionLabel="RECLUTAMIENTO"
      breadcrumbRoot="Empresa"
      homeRoute="/empresa"
      roleLabel="Empresa"
      notificationsRoute="/empresa/notificaciones"
      storageKey="ij-company-sidebar"
    >
      <router-outlet />
    </app-shell>
  `,
})
export class CompanyLayout {
  protected readonly navItems: readonly ShellNavItem[] = [
    { path: '/empresa', label: 'Inicio', icon: 'chart', exact: true },
    { path: '/empresa/vacantes', label: 'Mis vacantes', icon: 'briefcase' },
    { path: '/empresa/postulaciones', label: 'Postulaciones', icon: 'file' },
    { path: '/empresa/candidatos', label: 'Buscar candidatos', icon: 'search' },
    { path: '/empresa/promociones', label: 'Promociona tu vacante', icon: 'award' },
    { path: '/empresa/usuarios', label: 'Usuarios de la empresa', icon: 'users' },
    { path: '/empresa/perfil', label: 'Perfil de empresa', icon: 'building' },
  ];

  protected readonly footerNavItems: readonly ShellNavItem[] = [
    { path: environment.siteUrl, label: 'Ver sitio', icon: 'globe', external: true },
  ];

  protected readonly menuItems: readonly ShellMenuItem[] = [
    { path: '/empresa/mi-cuenta', label: 'Mi cuenta', icon: 'user' },
    { path: '/empresa/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ];
}
