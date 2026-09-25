import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  AppShell,
  ShellMenuItem,
  ShellNavItem,
} from '@/layout/app-shell/app-shell';
import { AuthService } from '@/core/auth/auth.service';
import { environment } from '@env';

/** Entrada del riel con el permiso que exige su página en el backend. */
interface CompanyNavItem extends ShellNavItem {
  readonly permission?: string;
}

/**
 * El permiso de cada sección es el del `GET` que la alimenta: si falta, la
 * página respondería 403. Desde los roles de empresa un reclutador puede no
 * tener, por ejemplo, `promotions.read`, y ofrecerle la sección sólo para
 * enseñarle un error confunde. «Inicio» queda siempre: es la raíz del área.
 */
const NAV_ITEMS: readonly CompanyNavItem[] = [
  { path: '/empresa', label: 'Inicio', icon: 'chart', exact: true },
  {
    path: '/empresa/vacantes',
    label: 'Mis vacantes',
    icon: 'briefcase',
    permission: 'vacancies.read',
  },
  {
    path: '/empresa/postulaciones',
    label: 'Postulaciones',
    icon: 'file',
    permission: 'applications.read',
  },
  {
    path: '/empresa/candidatos',
    label: 'Buscar candidatos',
    icon: 'search',
    permission: 'candidates.search',
  },
  {
    path: '/empresa/promociones',
    label: 'Promociona tu vacante',
    icon: 'award',
    permission: 'promotions.read',
  },
  {
    path: '/empresa/usuarios',
    label: 'Usuarios de la empresa',
    icon: 'users',
    permission: 'company_users.manage',
  },
  {
    path: '/empresa/perfil',
    label: 'Perfil de empresa',
    icon: 'building',
    permission: 'companies.read',
  },
];

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
      [navItems]="navItems()"
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
  private readonly auth = inject(AuthService);

  protected readonly navItems = computed<readonly ShellNavItem[]>(() => {
    const granted = this.auth.permissions();
    return NAV_ITEMS.filter(
      (item) => !item.permission || !granted || granted.has(item.permission),
    );
  });

  protected readonly footerNavItems: readonly ShellNavItem[] = [
    { path: environment.siteUrl, label: 'Ver sitio', icon: 'globe', external: true },
  ];

  protected readonly menuItems: readonly ShellMenuItem[] = [
    { path: '/empresa/mi-cuenta', label: 'Mi cuenta', icon: 'user' },
    { path: '/empresa/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ];
}
