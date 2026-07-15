import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IjLogo } from '@/shared/ui';

/**
 * Shell mínimo para las pantallas de acceso (login/registro/reset). Aporta el
 * fondo decorativo, el logo y el contenedor centrado; las páginas se proyectan
 * por el `router-outlet`.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, IjLogo],
  template: `
    <main
      class="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5 py-10"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[560px] rounded-full bg-brand-50 opacity-70 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-40 -left-28 h-[520px] w-[640px] rounded-full bg-brand-50 opacity-60 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute right-16 top-16 hidden h-56 w-80 opacity-60 md:block"
        style="background-image: repeating-linear-gradient(-45deg, #eceef3 0 1px, transparent 1px 12px);"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute bottom-16 left-16 hidden h-64 w-80 opacity-60 md:block"
        style="background-image: repeating-linear-gradient(-45deg, #eceef3 0 1px, transparent 1px 12px);"
        aria-hidden="true"
      ></div>

      <div class="relative flex w-full max-w-[440px] flex-col items-center">
        <a routerLink="/" class="mb-7 inline-flex" aria-label="Impulso Jobs — inicio">
          <ij-logo />
        </a>
        <router-outlet />
      </div>
    </main>
  `,
})
export class AuthLayout {}
