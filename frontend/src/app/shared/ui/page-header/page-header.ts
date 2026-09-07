import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Cabecera de página interior del portal: ruta de navegación, título y entrada.
 *
 * Existe porque "nosotros", "planes", "faq" y "contacto" repetían el mismo
 * bloque copiado cuatro veces, con los mismos tres defectos en cada copia: el
 * enlace "Inicio" apuntaba a la raíz (que redirige al listado de vacantes, no a
 * la portada), el separador era un guion suelto entre dos enlaces, y el
 * `aria-label` del `nav` decía "Breadcrumb" en un sitio en español.
 */
@Component({
  selector: 'ij-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section
      class="relative overflow-hidden bg-surface px-6 py-16 lg:px-[60px] lg:py-20"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand/[0.07]"
        aria-hidden="true"
      ></div>

      <div class="relative z-10 mx-auto max-w-container">
        <nav aria-label="Ruta de navegación" class="mb-5 flex items-center gap-2 text-sm text-muted">
          <a routerLink="/inicio" class="transition-colors hover:text-brand-strong">
            Inicio
          </a>
          <span aria-hidden="true">/</span>
          <span class="font-medium text-brand-strong" aria-current="page">
            {{ breadcrumb() }}
          </span>
        </nav>

        <h1 class="max-w-[20ch] text-4xl font-bold leading-[1.1] text-ink-900 sm:text-5xl">
          {{ title() }}
        </h1>

        @if (lead(); as lead) {
          <p class="mt-5 max-w-[62ch] text-base leading-relaxed text-muted">
            {{ lead }}
          </p>
        }
      </div>
    </section>
  `,
})
export class IjPageHeader {
  readonly title = input.required<string>();
  readonly breadcrumb = input.required<string>();
  readonly lead = input<string>('');
}
