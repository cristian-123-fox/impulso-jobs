import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IjButton } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutCtaContent } from '@/features/public/about/models/about.models';

/**
 * Cierre con las dos puertas de entrada.
 *
 * La versión anterior traía una imagen cuyo `src` era una llamada a la API de
 * text-to-image de una herramienta de desarrollo, con el prompt entero en la
 * URL: un artefacto que se coló del prototipo y que en producción no carga.
 * El panel usa brand-700, no el naranja de marca, que con texto blanco se
 * queda en 2.90:1.
 */
@Component({
  selector: 'app-about-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton, RouterLink, IjReveal],
  template: `
    <section class="px-6 py-20 lg:px-[60px]">
      <div
        ijReveal
        class="mx-auto max-w-[1080px] rounded-2xl bg-brand-700 px-8 py-14 text-center text-white sm:px-14"
      >
        <h2 class="mx-auto max-w-[20ch] text-3xl font-bold leading-tight text-white sm:text-[36px]">
          {{ content().title }}
        </h2>
        <p class="mx-auto mt-4 max-w-[56ch] text-[15px] leading-relaxed text-white/90">
          {{ content().description }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a ij-button routerLink="/auth/registro" variant="white" size="md">
            Crear cuenta gratis
          </a>
          <a
            ij-button
            routerLink="/auth/registro/empresa"
            size="md"
            class="bg-transparent text-white ring-1 ring-inset ring-white/70 hover:bg-white/15"
          >
            Publicar una vacante
          </a>
        </div>
      </div>
    </section>
  `,
})
export class AboutCta {
  readonly content = input.required<AboutCtaContent>();
}
