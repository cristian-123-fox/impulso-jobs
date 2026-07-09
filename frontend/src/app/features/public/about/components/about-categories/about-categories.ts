import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { AboutCategory } from '@/features/public/about/models/about.models';

@Component({
  selector: 'app-about-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton, IjIcon],
  template: `
    <section class="bg-surface px-6 py-[76px] text-center lg:px-[60px]">
      <div class="mx-auto max-w-[1080px]">
        <p class="mb-2 text-[15px] font-semibold text-accent-blue">
          Empleos por categoría
        </p>
        <h2 class="mb-[46px] text-[38px] font-bold leading-tight text-ink-900">
          Elige la categoría que deseas
        </h2>

        <div class="grid gap-[22px] sm:grid-cols-2 xl:grid-cols-4">
          @for (category of categories(); track category.name) {
            <article
              class="rounded-[10px] p-[30px_20px_22px] shadow-[0_16px_36px_-26px_rgba(0,0,0,.22)] transition-transform hover:-translate-y-1"
              [class.bg-white]="!category.featured"
              [class.bg-accent-blue]="category.featured"
            >
              <div
                class="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center rounded-2xl"
                [class.text-accent-blue]="!category.featured"
                [class.text-white]="category.featured"
              >
                <ij-icon [name]="category.icon" [size]="30" [strokeWidth]="1.7" />
              </div>

              <span
                class="mb-3 inline-flex rounded-full px-[14px] py-[5px] text-xs font-medium"
                [class.bg-[#eef2fb]]="!category.featured"
                [class.text-[#4a6fb0]]="!category.featured"
                [class.bg-white/20]="category.featured"
                [class.text-white]="category.featured"
              >
                {{ category.jobsLabel }}
              </span>

              <div
                class="text-[15px] font-semibold"
                [class.text-ink-900]="!category.featured"
                [class.text-white]="category.featured"
              >
                {{ category.name }}
              </div>
            </article>
          }
        </div>

        <button ij-button type="button" variant="accent" class="mt-10">
          Ver todas las categorías
        </button>
      </div>
    </section>
  `,
})
export class AboutCategories {
  readonly categories = input.required<readonly AboutCategory[]>();
}
