import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TONE_SOFT } from '@/shared/ui';
import { WorkStep } from '@/features/public/home/models/home.models';
import { SectionHeading } from '@/features/public/home/components/section-heading/section-heading';

/** Sección "Cómo funciona": tres pasos numerados. */
@Component({
  selector: 'app-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading],
  template: `
    <section class="px-6 py-20 lg:px-[60px]">
      <app-section-heading eyebrow="Proceso de trabajo">
        Cómo funciona
      </app-section-heading>

      <div
        class="mx-auto mt-14 grid max-w-[1120px] gap-7 sm:grid-cols-2 lg:grid-cols-3"
      >
        @for (step of steps(); track step.num) {
          <div class="relative px-6 pb-8 pt-11 text-center">
            <span
              class="absolute left-1/2 top-[-6px] -translate-x-1/2 text-7xl font-extrabold leading-none text-surface"
              aria-hidden="true"
              >{{ step.num }}</span
            >
            <div class="relative">
              <div
                [class]="
                  'mx-auto mb-6 flex h-24 w-32 items-center justify-center rounded-xl ' +
                  soft[step.tone]
                "
              >
                <div
                  class="flex items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-left text-[11px] font-semibold leading-tight shadow-float"
                >
                  <span class="h-6 w-6 shrink-0 rounded-md bg-current"></span>
                  {{ step.title }}
                </div>
              </div>
              <h4 class="mb-3 text-lg font-semibold text-ink-900">
                {{ step.title }}
              </h4>
              <p class="mx-auto max-w-[250px] text-sm leading-relaxed text-muted">
                {{ step.description }}
              </p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class HowItWorks {
  readonly steps = input.required<readonly WorkStep[]>();
  protected readonly soft = TONE_SOFT;
}
