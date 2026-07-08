import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { Testimonial } from '../../models/home.models';
import { MediaFrame } from '../media-frame/media-frame';

/** Sección de testimonios de clientes. */
@Component({
  selector: 'app-testimonials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, MediaFrame],
  template: `
    <section class="px-6 py-16 lg:px-[60px]">
      <div class="mx-auto max-w-[1000px]">
        <div class="mb-11">
          <p class="mb-2 text-[15px] font-semibold text-brand">
            Testimonios de clientes
          </p>
          <h2 class="text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]">
            Lo que dicen quienes ya nos usaron
          </h2>
        </div>

        <div class="grid gap-7 md:grid-cols-2">
          @for (testimonial of testimonials(); track testimonial.name) {
            <div
              class="flex flex-col gap-6 rounded-xl bg-surface p-8 sm:flex-row sm:items-start"
            >
              <div
                class="h-32 w-28 shrink-0 overflow-hidden rounded-[10px]"
              >
                <app-media-frame icon="user" />
              </div>
              <div>
                <svg
                  width="40"
                  height="30"
                  viewBox="0 0 40 30"
                  class="mb-3 fill-brand/90"
                  aria-hidden="true"
                >
                  <path
                    d="M0 30V16C0 7 5 1 15 0v6c-5 1-7 4-7 8h7v16H0zm22 0V16C22 7 27 1 37 0v6c-5 1-7 4-7 8h7v16H22z"
                  />
                </svg>
                <p class="mb-4 text-sm leading-relaxed text-body/80">
                  {{ testimonial.quote }}
                </p>
                <h5 class="text-[15px] font-semibold text-ink-900">
                  {{ testimonial.name }}
                </h5>
                <p class="text-[13px] text-muted">{{ testimonial.role }}</p>
              </div>
            </div>
          }
        </div>

        <div class="mt-9 flex justify-center gap-2.5">
          <button ij-button type="button" variant="soft" shape="circle" aria-label="Anterior">
            <ij-icon name="chevron-left" [size]="15" [strokeWidth]="2.5" />
          </button>
          <button ij-button type="button" shape="circle" aria-label="Siguiente">
            <ij-icon name="chevron-right" [size]="15" [strokeWidth]="2.5" />
          </button>
        </div>
      </div>
    </section>
  `,
})
export class Testimonials {
  readonly testimonials = input.required<readonly Testimonial[]>();
}
