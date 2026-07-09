import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactHeroContent } from '@/features/public/contact/models/contact.models';

/**
 * Hero interno para páginas del portal público con breadcrumb y fondo suave.
 */
@Component({
  selector: 'app-contact-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="relative overflow-hidden bg-surface px-6 py-20 text-center lg:px-[60px]">
      <div
        class="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-accent-pink-soft blur-3xl"
      ></div>
      <div
        class="absolute -right-16 -top-10 h-80 w-80 rounded-full bg-brand-50 blur-3xl"
      ></div>

      <div class="relative mx-auto flex max-w-[760px] flex-col items-center">
        <p class="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          {{ content().eyebrow }}
        </p>
        <h1 class="text-4xl font-bold leading-tight text-ink-900 sm:text-[44px]">
          {{ content().title }}
        </h1>
        <p class="mt-5 max-w-[680px] text-[15px] leading-7 text-muted sm:text-base">
          {{ content().description }}
        </p>

        <nav
          aria-label="Breadcrumb"
          class="mt-7 flex items-center gap-2 text-sm font-medium text-muted"
        >
          <a routerLink="/" class="transition-colors hover:text-brand">Inicio</a>
          <span aria-hidden="true">/</span>
          <span class="text-brand">Contacto</span>
        </nav>
      </div>
    </section>
  `,
})
export class ContactHero {
  readonly content = input.required<ContactHeroContent>();
}
