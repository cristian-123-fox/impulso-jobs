import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { IconName, IjIcon, IjLogo } from '@/shared/ui';

interface AdminNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/** Shell del área de administración: sidebar + topbar (sesión) + outlet. */
@Component({
  selector: 'app-admin-layout',
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
          <span class="pl-2.5 text-[11px] font-bold tracking-[1px] text-muted">ADMINISTRACIÓN</span>
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
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-10 flex h-[68px] items-center gap-3 border-b border-line bg-white px-5 sm:px-7"
        >
          <a routerLink="/admin/usuarios" class="lg:hidden" aria-label="Administración">
            <ij-logo size="sm" />
          </a>
          <div class="ml-auto flex items-center gap-3">
            <div class="hidden text-right sm:block">
              <div class="text-[13px] font-bold text-ink-900">{{ auth.currentUser()?.email }}</div>
              <div class="text-[11.5px] text-muted">Administrador</div>
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navItems: readonly AdminNavItem[] = [
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { path: '/admin/empresas', label: 'Empresas', icon: 'building' },
    { path: '/admin/planes', label: 'Planes', icon: 'tag' },
    { path: '/admin/roles', label: 'Roles y permisos', icon: 'shield' },
  ];

  protected onLogout(): void {
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl('/auth/login'));
  }
}
