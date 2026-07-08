import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { Article } from '../../models/home.models';
import { SectionHeading } from '../section-heading/section-heading';
import { MediaFrame } from '../media-frame/media-frame';

/** Sección de últimos artículos del blog. */
@Component({
  selector: 'app-latest-articles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, SectionHeading, MediaFrame],
  template: `
    <section class="px-6 pb-20 pt-16 lg:px-[60px]">
      <app-section-heading eyebrow="Nuestro blog">Últimos artículos</app-section-heading>

      <div
        class="mx-auto mt-12 grid max-w-[1080px] gap-8 text-left sm:grid-cols-2 lg:grid-cols-3"
      >
        @for (article of articles(); track article.title) {
          <article>
            <div class="mb-5 h-48 overflow-hidden rounded-xl">
              <app-media-frame icon="image" />
            </div>
            <div class="mb-3 flex flex-wrap gap-4 text-xs text-muted">
              <span class="flex items-center gap-1.5">
                <ij-icon name="calendar" [size]="12" class="text-brand" />
                {{ article.date }}
              </span>
              <span class="flex items-center gap-1.5">
                <ij-icon name="user" [size]="12" class="text-brand" />
                Por {{ article.author }}
              </span>
            </div>
            <h4 class="mb-3 text-lg font-semibold leading-snug text-ink-900">
              {{ article.title }}
            </h4>
            <p class="mb-4 text-sm leading-relaxed text-muted">
              {{ article.excerpt }}
            </p>
            <a href="#" class="text-sm font-semibold text-brand">Leer más</a>
          </article>
        }
      </div>

      <div class="mt-11 flex justify-center gap-2.5">
        <button ij-button type="button" variant="soft" shape="circle" aria-label="Anterior">
          <ij-icon name="chevron-left" [size]="15" [strokeWidth]="2.5" />
        </button>
        <button ij-button type="button" shape="circle" aria-label="Siguiente">
          <ij-icon name="chevron-right" [size]="15" [strokeWidth]="2.5" />
        </button>
      </div>
    </section>
  `,
})
export class LatestArticles {
  readonly articles = input.required<readonly Article[]>();
}
