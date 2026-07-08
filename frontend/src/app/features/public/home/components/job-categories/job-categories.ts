import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon, TONE_SOFT } from '@/shared/ui';
import { JobCategory } from '@/features/public/home/models/home.models';

/** Sección de categorías de empleo con carrusel (controles) y CTA. */
@Component({
  selector: 'app-job-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton],
  template: `
    <section class="bg-surface px-6 py-[72px] lg:px-[60px]">
      <div class="mx-auto max-w-[1180px]">
        <div
          class="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
        >
          <div class="max-w-[520px]">
            <p class="mb-2 text-[15px] font-semibold text-brand">
              Empleos por categoría
            </p>
            <h2 class="text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]">
              Elige la categoría que deseas
            </h2>
          </div>
          <p class="max-w-[360px] text-sm leading-relaxed text-muted">
            Explora las áreas con más oportunidades y encuentra vacantes que se
            ajusten a tu experiencia y objetivos profesionales.
          </p>
        </div>

        <div class="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          @for (category of categories(); track category.name) {
            <a
              href="#"
              class="block rounded-xl bg-white p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <div
                [class]="
                  'mb-5 flex h-14 w-14 items-center justify-center rounded-xl ' +
                  soft[category.tone]
                "
              >
                <ij-icon [name]="category.icon" [size]="26" [strokeWidth]="1.8" />
              </div>
              <h4 class="mb-1.5 text-[17px] font-semibold text-ink-900">
                {{ category.jobsLabel }}
              </h4>
              <p class="text-sm text-muted">{{ category.name }}</p>
            </a>
          }
        </div>

        <div class="flex items-center justify-between">
          <div class="flex gap-2.5">
            <button
              ij-button
              type="button"
              variant="soft"
              shape="circle"
              aria-label="Anterior"
            >
              <ij-icon name="chevron-left" [size]="15" [strokeWidth]="2.5" />
            </button>
            <button
              ij-button
              type="button"
              shape="circle"
              aria-label="Siguiente"
            >
              <ij-icon name="chevron-right" [size]="15" [strokeWidth]="2.5" />
            </button>
          </div>
          <a ij-button href="#" size="sm">Ver todas las categorías</a>
        </div>
      </div>
    </section>
  `,
})
export class JobCategories {
  readonly categories = input.required<readonly JobCategory[]>();
  protected readonly soft = TONE_SOFT;
}
