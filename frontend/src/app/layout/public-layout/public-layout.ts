import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '@/layout/public-layout/navbar/navbar';
import { Footer } from '@/layout/public-layout/footer/footer';
import { ScrollTop } from '@/layout/public-layout/scroll-top/scroll-top';
import { IjCookieBanner } from '@/shared/ui/cookie-banner/cookie-banner';

/** Shell del portal público: navbar sticky + contenido enrutado + footer. */
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, Footer, ScrollTop, IjCookieBanner],
  template: `
    <div class="flex min-h-screen flex-col bg-white">
      <app-navbar />
      <main class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
    </div>
    <app-scroll-top />

    <!--
      El aviso de cookies va en cada shell, no en la raíz: así aparece en todas
      las áreas sin cargarlo en el bundle inicial. Empresa, candidato y admin lo
      montan desde app-shell; público y acceso, aquí.
    -->
    <ij-cookie-banner />
  `,
})
export class PublicLayout {}
