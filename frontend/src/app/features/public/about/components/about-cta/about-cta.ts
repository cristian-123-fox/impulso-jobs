import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { AboutCtaContent } from '@/features/public/about/models/about.models';

@Component({
  selector: 'app-about-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton, IjIcon],
  template: `
    <section class="relative overflow-hidden bg-[#f6f8fb] py-[70px]">
      <div
        class="absolute inset-0 opacity-70"
        style="background-image: radial-gradient(#e0e4ec 1.4px, transparent 1.4px); background-size: 22px 22px;"
      ></div>

      <div
        class="relative z-[1] mx-auto grid max-w-[1120px] items-end gap-0 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-[60px]"
      >
        <div class="relative hidden h-[400px] lg:block">
          <img
            [src]="content().imageSrc"
            [alt]="content().imageAlt"
            class="h-full w-full object-cover object-top"
          />
        </div>

        <div class="relative rounded-md bg-accent-blue px-8 py-[52px] text-white lg:-top-5 lg:px-12">
          <p class="mb-[14px] text-sm font-medium opacity-85">{{ content().eyebrow }}</p>
          <h2 class="mb-5 text-[34px] font-bold leading-[1.25] text-white">
            {{ content().title }}
          </h2>
          <p class="mb-[30px] max-w-[460px] text-sm leading-[1.7] opacity-85">
            {{ content().description }}
          </p>
          <button ij-button type="button" variant="white">
            {{ content().buttonLabel }}
            <ij-icon name="arrow-up" [size]="15" />
          </button>
        </div>
      </div>
    </section>
  `,
})
export class AboutCta {
  readonly content = input.required<AboutCtaContent>();
}
