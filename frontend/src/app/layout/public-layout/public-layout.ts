import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Footer } from './footer/footer';
import { ScrollTop } from './scroll-top/scroll-top';

/** Shell del portal público: navbar sticky + contenido enrutado + footer. */
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, Footer, ScrollTop],
  template: `
    <div class="flex min-h-screen flex-col bg-white">
      <app-navbar />
      <main class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
    </div>
    <app-scroll-top />
  `,
})
export class PublicLayout {}
