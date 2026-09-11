import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon, TONE_SOFT } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutStep } from '@/features/public/about/models/about.models';

/**
 * Los cuatro pasos, como lista numerada en dos columnas.
 *
 * Ya no recibe `bullets`: eran cuatro promesas sueltas ("Vacantes confiables y
 * de calidad", "Oportunidades nacionales e internacionales") que el producto no
 * respalda; la internacional, además, es falsa en una bolsa sólo de México.
 */
@Component({
  selector: 'app-about-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjReveal, TranslocoDirective],
  template: `
    <section *transloco="let t" class="px-6 pb-4 pt-20 lg:px-[60px]">
      <div class="mx-auto max-w-[1080px]">
        <h2 class="max-w-[20ch] text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]">
          {{ t('about.steps.title') }}
        </h2>

        <ol class="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          @for (step of steps(); track step.num; let i = $index) {
            <li ijReveal [revealDelay]="i * 90" class="flex gap-5">
              <span
                [class]="
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ' +
                  soft[step.tone]
                "
              >
                <ij-icon [name]="step.icon" [size]="22" [strokeWidth]="1.8" />
              </span>
              <span>
                <span class="block text-[13px] font-bold tracking-[0.14em] text-muted">
                  {{ step.num }}
                </span>
                <span class="mt-1 block text-lg font-semibold text-ink-900">
                  {{ t(step.titleKey) }}
                </span>
                <span class="mt-1.5 block max-w-[40ch] text-sm leading-relaxed text-muted">
                  {{ t(step.descriptionKey) }}
                </span>
              </span>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class AboutSteps {
  readonly steps = input.required<readonly AboutStep[]>();
  protected readonly soft = TONE_SOFT;
}
