import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AboutHeroContent } from '@/features/public/about/models/about.models';

@Component({
  selector: 'app-about-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section
      class="relative overflow-hidden bg-surface px-6 py-[70px] text-center lg:px-[60px] lg:py-[78px]"
    >
      <div
        class="absolute -left-[80px] -top-[100px] h-[340px] w-[340px] rounded-full"
        style="background: radial-gradient(circle, rgba(233, 108, 167, 0.14), transparent 70%);"
      ></div>
      <div
        class="absolute -right-[40px] -top-[60px] h-[380px] w-[440px] rounded-full"
        style="background: radial-gradient(circle, rgba(43, 190, 220, 0.16), transparent 68%);"
      ></div>

      <div class="relative z-10">
        <h1 class="mb-[14px] text-[34px] font-bold leading-tight text-ink-900">
          {{ content().title }}
        </h1>
        <nav
          aria-label="Breadcrumb"
          class="flex items-center justify-center gap-2 text-sm text-[#6b6b82]"
        >
          <a routerLink="/" class="transition-colors hover:text-accent-blue">Inicio</a>
          <span>-</span>
          <span class="text-accent-blue">{{ content().breadcrumbLabel }}</span>
        </nav>
      </div>
    </section>
  `,
})
export class AboutHero {
  readonly content = input.required<AboutHeroContent>();
}
