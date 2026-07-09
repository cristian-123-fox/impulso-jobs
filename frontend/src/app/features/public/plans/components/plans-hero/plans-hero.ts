import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlansHeroContent } from '@/features/public/plans/models/plans.models';

@Component({
  selector: 'app-plans-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section
      class="relative overflow-hidden bg-surface px-6 py-16 text-center lg:px-[60px] lg:py-[72px]"
    >
      <div
        class="absolute -left-[80px] -top-[100px] h-[340px] w-[340px] rounded-full"
        style="background: radial-gradient(circle, rgba(233, 108, 167, 0.14), transparent 70%);"
      ></div>
      <div
        class="absolute -right-[40px] -top-[60px] h-[380px] w-[440px] rounded-full"
        style="background: radial-gradient(circle, rgba(43, 190, 220, 0.16), transparent 68%);"
      ></div>

      <div class="relative z-10 mx-auto max-w-3xl">
        <h1 class="mb-3 text-[34px] font-bold leading-tight text-ink-900 lg:text-[40px]">
          {{ content().title }}
        </h1>
        <nav
          aria-label="Breadcrumb"
          class="flex items-center justify-center gap-2 text-sm text-muted"
        >
          <a routerLink="/" class="transition-colors hover:text-brand">Inicio</a>
          <span>-</span>
          <span class="text-brand">{{ content().breadcrumbLabel }}</span>
        </nav>
        <p class="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-body">
          {{ content().description }}
        </p>
      </div>
    </section>
  `,
})
export class PlansHero {
  readonly content = input.required<PlansHeroContent>();
}
