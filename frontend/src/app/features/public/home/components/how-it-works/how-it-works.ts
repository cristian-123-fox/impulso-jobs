import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjIcon, TONE_SOFT } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { WorkStep } from '@/features/public/home/models/home.models';
import { SectionHeading } from '@/features/public/home/components/section-heading/section-heading';

/**
 * "Cómo funciona" como línea de tiempo horizontal, no como tres tarjetas
 * iguales: la página ya tiene una rejilla de tarjetas justo encima y repetir la
 * misma familia de layout es lo que hace que un sitio parezca una plantilla.
 *
 * Antes cada paso metía dentro del icono una tarjetita blanca que repetía el
 * título del propio paso. Ese doble título era ruido y se retiró.
 */
@Component({
  selector: 'app-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, SectionHeading, IjReveal],
  template: `
    <section class="px-6 py-20 lg:px-[60px]">
      <app-section-heading
        lead="Tres pasos entre crear tu cuenta y estar en un proceso de selección."
      >
        Cómo funciona
      </app-section-heading>

      <ol class="relative mx-auto mt-14 grid max-w-[1000px] gap-10 sm:grid-cols-3 sm:gap-6">
        <!-- Hilo que une los tres pasos; decorativo, sólo en desktop. -->
        <span
          class="pointer-events-none absolute left-[16.6%] right-[16.6%] top-8 hidden h-px bg-gradient-to-r from-line via-brand/40 to-line sm:block"
          aria-hidden="true"
        ></span>

        @for (step of steps(); track step.num; let i = $index) {
          <li ijReveal [revealDelay]="i * 110" class="relative text-center">
            <span
              [class]="
                'relative z-[1] mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-8 ring-white ' +
                soft[step.tone]
              "
            >
              <ij-icon [name]="step.icon" [size]="26" [strokeWidth]="1.8" />
            </span>
            <p class="mt-5 text-[13px] font-bold tracking-[0.14em] text-muted">
              {{ step.num }}
            </p>
            <h3 class="mt-1.5 text-lg font-semibold text-ink-900">
              {{ step.title }}
            </h3>
            <p class="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
              {{ step.description }}
            </p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class HowItWorks {
  readonly steps = input.required<readonly WorkStep[]>();
  protected readonly soft = TONE_SOFT;
}
