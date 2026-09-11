import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjReveal } from '@/shared/directives/reveal';
import { Testimonial } from '@/features/public/home/models/home.models';

/**
 * Testimonios. Dos citas cortas con atribución completa (nombre, rol y ciudad);
 * antes firmaban "Nikola Tesla" y "Ada Lovelace" sobre un placeholder gris, que
 * es la forma más rápida de que nadie se crea la sección.
 *
 * Se retiraron las flechas de carrusel: no navegaban a ninguna parte y con dos
 * elementos no hay nada que paginar.
 */
@Component({
  selector: 'app-testimonials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjReveal, TranslocoDirective],
  template: `
    <section *transloco="let t" class="px-6 py-16 lg:px-[60px]">
      <div class="mx-auto max-w-[1000px]">
        <h2
          class="mb-11 max-w-[20ch] text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]"
        >
          {{ t('home.testimonials.title') }}
        </h2>

        <div class="grid gap-7 md:grid-cols-2">
          @for (
            testimonial of testimonials();
            track testimonial.name;
            let i = $index
          ) {
            <figure
              ijReveal
              [revealDelay]="i * 110"
              class="flex gap-5 rounded-xl bg-surface p-8"
            >
              <!--
                Iniciales, no una foto de stock. Poner la cara de un
                desconocido bajo el testimonio de otra persona es inventar dos
                cosas en vez de una; cuando haya retratos reales con permiso,
                aquí va la etiqueta img.
              -->
              <span
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-strong"
                aria-hidden="true"
              >
                {{ initials(testimonial.name) }}
              </span>
              <div>
                <blockquote
                  class="text-[15px] leading-relaxed text-body before:mr-0.5 before:content-['“'] after:content-['”']"
                >
                  {{ t(testimonial.quoteKey) }}
                </blockquote>
                <figcaption class="mt-4">
                  <span class="block text-[15px] font-semibold text-ink-900">
                    {{ testimonial.name }}
                  </span>
                  <span class="block text-[13px] text-muted">
                    {{ t(testimonial.roleKey) }}
                  </span>
                </figcaption>
              </div>
            </figure>
          }
        </div>
      </div>
    </section>
  `,
})
export class Testimonials {
  readonly testimonials = input.required<readonly Testimonial[]>();

  /** "Ximena Alcántara" -> "XA". */
  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }
}
