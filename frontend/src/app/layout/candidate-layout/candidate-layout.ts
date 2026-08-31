import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { CandidateProfileFacade } from '@/features/candidate/data/candidate-profile.facade';
import { IconName, IjIcon, IjLogo } from '@/shared/ui';

interface CandidateNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/**
 * Shell del área del candidato: sidebar + topbar (sesión) + outlet.
 * El nombre y la foto del header salen de `GET /candidate/profile`
 * (la sesión sólo trae email y rol), con el email como fallback.
 */
@Component({
  selector: 'app-candidate-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IjLogo, IjIcon],
  template: `
    <div class="flex min-h-screen bg-surface text-ink-900">
      <aside
        class="sticky top-0 hidden h-screen w-[248px] flex-shrink-0 flex-col border-r border-line bg-white lg:flex"
      >
        <div class="flex h-[68px] items-center border-b border-line px-6">
          <ij-logo size="sm" />
        </div>
        <div class="px-4 pb-2 pt-4">
          <span class="pl-2.5 text-[11px] font-bold tracking-[1px] text-muted">
            MI CUENTA
          </span>
        </div>
        <nav class="flex flex-1 flex-col gap-1 px-4">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand-50 text-brand"
              class="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-semibold text-body transition-colors hover:bg-surface"
            >
              <ij-icon [name]="item.icon" [size]="19" [strokeWidth]="1.9" />
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="border-t border-line p-4">
          <a
            routerLink="/vacantes"
            class="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface hover:text-body"
          >
            <ij-icon name="search" [size]="19" [strokeWidth]="1.9" />
            Buscar empleo
          </a>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-10 flex h-[68px] items-center gap-3 border-b border-line bg-white px-5 sm:px-7"
        >
          <a routerLink="/candidato/perfil" class="lg:hidden" aria-label="Mi cuenta">
            <ij-logo size="sm" />
          </a>
          <div class="ml-auto flex items-center gap-3">
            <div class="hidden text-right sm:block">
              <div class="text-[13px] font-bold text-ink-900">
                {{ displayName() }}
              </div>
              <div class="text-[11.5px] text-muted">Candidato</div>
            </div>
            <div
              class="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[11px] border border-line bg-brand-50 text-[13px] font-extrabold text-brand"
            >
              @if (photoUrl(); as photo) {
                <img [src]="photo" alt="" class="h-full w-full object-cover" />
              } @else {
                {{ initials() }}
              }
            </div>
            <button
              type="button"
              aria-label="Cerrar sesión"
              class="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border border-line bg-surface text-body transition-colors hover:text-brand"
              (click)="onLogout()"
            >
              <ij-icon name="logout" [size]="19" [strokeWidth]="1.8" />
            </button>
          </div>
        </header>

        <!-- Navegación en móvil: el sidebar sólo existe desde lg. -->
        <nav
          class="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2.5 lg:hidden"
        >
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand-50 text-brand"
              class="flex flex-shrink-0 items-center gap-2 rounded-[11px] px-3 py-2 text-[13px] font-semibold text-body transition-colors hover:bg-surface"
            >
              <ij-icon [name]="item.icon" [size]="17" [strokeWidth]="1.9" />
              {{ item.label }}
            </a>
          }
          <a
            routerLink="/vacantes"
            class="flex flex-shrink-0 items-center gap-2 rounded-[11px] px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-surface"
          >
            <ij-icon name="search" [size]="17" [strokeWidth]="1.9" />
            Buscar empleo
          </a>
        </nav>

        <main class="flex-1 overflow-y-auto p-4 sm:p-7">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class CandidateLayout {
  protected readonly auth = inject(AuthService);
  private readonly profileFacade = inject(CandidateProfileFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navItems: readonly CandidateNavItem[] = [
    { path: '/candidato/perfil', label: 'Mi perfil', icon: 'user' },
    { path: '/candidato/cv', label: 'Mis hojas de vida', icon: 'file' },
    { path: '/candidato/postulaciones', label: 'Mis postulaciones', icon: 'briefcase' },
    { path: '/candidato/configuracion', label: 'Configuración', icon: 'settings' },
  ];

  protected readonly displayName = computed(() => {
    const profile = this.profileFacade.profile();
    if (profile) {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      if (name) return name;
    }
    return this.auth.currentUser()?.email ?? '';
  });

  protected readonly initials = computed(() =>
    this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
  );

  protected readonly photoUrl = computed(
    () => this.profileFacade.profile()?.profilePhotoUrl ?? null,
  );

  constructor() {
    this.profileFacade.ensureProfile();
  }

  protected onLogout(): void {
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl('/auth/login'));
  }
}
