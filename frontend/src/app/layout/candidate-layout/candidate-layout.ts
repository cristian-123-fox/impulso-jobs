import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { CandidateProfileFacade } from '@/features/candidate/data/candidate-profile.facade';
import { IjIcon } from '@/shared/ui';
import {
  AppShell,
  ShellMenuItem,
  ShellNavItem,
} from '@/layout/app-shell/app-shell';

/**
 * Área del candidato. El armazón es `app-shell`, el mismo que admin y empresa.
 *
 * Nombre y foto los sobrescribe con `GET /candidate/profile` en vez de dejar
 * los de la sesión: es la ficha que el propio candidato edita, y el facade la
 * refresca al instante al guardarla — `GET /auth/me` se cachea por carga.
 *
 * El pie del riel («Buscar empleo») se proyecta: es lo único que esta área
 * tiene y las otras no.
 */
@Component({
  selector: 'app-candidate-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShell, RouterLink, RouterOutlet, IjIcon],
  template: `
    <app-shell
      [navItems]="navItems"
      [menuItems]="menuItems"
      [displayName]="displayName()"
      [avatarUrl]="photoUrl()"
      sectionLabel="MI CUENTA"
      breadcrumbRoot="Candidato"
      homeRoute="/candidato/perfil"
      roleLabel="Candidato"
      notificationsRoute="/candidato/notificaciones"
      storageKey="ij-candidate-sidebar"
    >
      <a
        shellRailFooter
        routerLink="/vacantes"
        title="Buscar empleo"
        class="flex items-center gap-3 rounded-xl border-t border-line px-3 py-2.5 pt-4 text-[13.5px] font-bold text-muted transition-colors hover:text-body"
      >
        <ij-icon name="search" [size]="19" [strokeWidth]="1.9" />
        <span class="truncate">Buscar empleo</span>
      </a>

      <router-outlet />
    </app-shell>
  `,
})
export class CandidateLayout {
  private readonly auth = inject(AuthService);
  private readonly profileFacade = inject(CandidateProfileFacade);

  protected readonly navItems: readonly ShellNavItem[] = [
    { path: '/candidato/perfil', label: 'Mi perfil', icon: 'user' },
    { path: '/candidato/cv', label: 'Mis hojas de vida', icon: 'file' },
    { path: '/candidato/postulaciones', label: 'Mis postulaciones', icon: 'briefcase' },
    { path: '/candidato/guardadas', label: 'Guardadas', icon: 'bookmark' },
    { path: '/candidato/configuracion', label: 'Configuración', icon: 'settings' },
  ];

  protected readonly menuItems: readonly ShellMenuItem[] = [
    { path: '/candidato/mi-cuenta', label: 'Mi cuenta', icon: 'shield' },
    { path: '/candidato/notificaciones', label: 'Notificaciones', icon: 'bell' },
  ];

  protected readonly displayName = computed(() => {
    const profile = this.profileFacade.profile();
    if (profile) {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      if (name) return name;
    }
    return this.auth.currentUser()?.email ?? '';
  });

  /**
   * Manda la foto del perfil de aspirante, que es la que el candidato gestiona
   * en /candidato/perfil. La de la sesión cubre el hueco mientras la ficha no
   * ha llegado y el caso de que viniera de users.photo_url (el back-office).
   */
  protected readonly photoUrl = computed(
    () =>
      this.profileFacade.profile()?.profilePhotoUrl ??
      this.auth.currentUser()?.avatarUrl ??
      null,
  );

  constructor() {
    this.profileFacade.ensureProfile();
  }
}
