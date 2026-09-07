import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IjButton, IjIcon, TONE_SOFT } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutAudience } from '@/features/public/about/models/about.models';

/**
 * Para quién es el producto: dos columnas, candidato y empresa.
 *
 * Sustituye a la rejilla de ocho "categorías" con cifras inventadas y repetidas
 * que ocupaba este lugar y que no decía nada sobre la empresa.
 */
@Component({
  selector: 'app-about-audiences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, RouterLink, IjReveal],
  template: `
    <section class="px-6 py-20 lg:px-[60px]">
      <div class="mx-auto grid max-w-[1080px] gap-6 lg:grid-cols-2">
        @for (audience of audiences(); track audience.title; let i = $index) {
          <article
            ijReveal
            [revealDelay]="i * 110"
            class="flex flex-col rounded-2xl border border-line bg-white p-8 shadow-card"
          >
            <span
              [class]="
                'mb-6 flex h-12 w-12 items-center justify-center rounded-xl ' +
                soft[audience.tone]
              "
            >
              <ij-icon [name]="audience.icon" [size]="24" [strokeWidth]="1.8" />
            </span>

            <h2 class="text-2xl font-bold text-ink-900">{{ audience.title }}</h2>
            <p class="mt-2 text-[15px] leading-relaxed text-muted">
              {{ audience.description }}
            </p>

            <ul class="mt-6 flex flex-1 flex-col gap-3">
              @for (feature of audience.features; track feature) {
                <li class="flex items-start gap-3 text-[15px] leading-relaxed text-body">
                  <span
                    class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-strong"
                  >
                    <ij-icon name="check" [size]="10" [strokeWidth]="3.5" />
                  </span>
                  {{ feature }}
                </li>
              }
            </ul>

            <a
              ij-button
              [routerLink]="audience.ctaPath"
              size="md"
              class="mt-8 self-start"
            >
              {{ audience.ctaLabel }}
            </a>
          </article>
        }
      </div>
    </section>
  `,
})
export class AboutAudiences {
  readonly audiences = input.required<readonly AboutAudience[]>();
  protected readonly soft = TONE_SOFT;
}
