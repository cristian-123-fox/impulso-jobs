import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjButton, IjIcon } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';
import { LoadState } from '@/features/public/home/models/home.models';
import { SectionHeading } from '@/features/public/home/components/section-heading/section-heading';

/**
 * Últimas vacantes publicadas, con datos reales de `GET /vacancies`.
 *
 * Sustituye a la lista de cinco vacantes inventadas (todas en Bogotá, todas con
 * la misma dirección y sueldos sin moneda) que vivía en el facade. Reutiliza
 * `app-vacancy-card`, la misma tarjeta del listado, así que una vacante se ve
 * igual en la home que en `/vacantes`.
 *
 * Cubre los tres estados, no sólo el feliz: esqueleto mientras carga, aviso con
 * reintento si la API falla y un vacío que explica qué hacer.
 */
@Component({
  selector: 'app-featured-vacancies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IjButton,
    IjIcon,
    SectionHeading,
    VacancyCard,
    IjReveal,
    TranslocoDirective,
  ],
  template: `
    <section
      *transloco="let t"
      class="relative overflow-hidden px-6 py-16 lg:px-[60px]"
    >
      <div
        class="pointer-events-none absolute -right-36 top-28 hidden h-[420px] w-[420px] rounded-full border-[60px] border-brand/[0.05] lg:block"
        aria-hidden="true"
      ></div>

      <div class="relative z-[1]">
        <app-section-heading>{{ t('home.featured.title') }}</app-section-heading>

        <div class="mx-auto mt-12 max-w-[860px]">
          @switch (state()) {
            @case ('loading') {
              <!-- Esqueleto con la forma de la tarjeta final, no un spinner. -->
              <div class="flex flex-col gap-[18px]" aria-hidden="true">
                @for (row of skeletonRows; track row) {
                  <div class="flex gap-5 rounded-2xl bg-white p-5 shadow-card">
                    <div class="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-line"></div>
                    <div class="flex-1 space-y-3 py-1">
                      <div class="h-4 w-2/5 animate-pulse rounded bg-line"></div>
                      <div class="h-3 w-3/5 animate-pulse rounded bg-line"></div>
                      <div class="h-3 w-1/4 animate-pulse rounded bg-line"></div>
                    </div>
                  </div>
                }
              </div>
              <p class="sr-only" role="status">{{ t('home.featured.loading') }}</p>
            }

            @case ('error') {
              <div
                class="rounded-2xl border border-line bg-white p-8 text-center shadow-card"
                role="alert"
              >
                <span
                  class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-strong"
                >
                  <ij-icon name="alert-triangle" [size]="24" />
                </span>
                <h3 class="text-lg font-semibold text-ink-900">
                  {{ t('home.featured.errorTitle') }}
                </h3>
                <p class="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-muted">
                  {{ t('home.featured.errorBody') }}
                </p>
                <div class="mt-6 flex flex-wrap justify-center gap-3">
                  <button ij-button type="button" size="sm" (click)="retry.emit()">
                    {{ t('home.featured.retry') }}
                  </button>
                  <a ij-button routerLink="/vacantes" variant="outline" size="sm">
                    {{ t('home.featured.goToList') }}
                  </a>
                </div>
              </div>
            }

            @default {
              @if (vacancies().length) {
                <div class="flex flex-col gap-[18px]">
                  @for (vacancy of vacancies(); track vacancy.id; let i = $index) {
                    <app-vacancy-card
                      ijReveal
                      [revealDelay]="i * 60"
                      [vacancy]="vacancy"
                    />
                  }
                </div>

                <div class="mt-9 text-center">
                  <a ij-button routerLink="/vacantes" size="lg">
                    {{ t('home.featured.viewAll') }}
                  </a>
                </div>
              } @else {
                <div
                  class="rounded-2xl border border-dashed border-line bg-surface p-10 text-center"
                >
                  <span
                    class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-strong shadow-card"
                  >
                    <ij-icon name="briefcase" [size]="24" />
                  </span>
                  <h3 class="text-lg font-semibold text-ink-900">
                    {{ t('home.featured.emptyTitle') }}
                  </h3>
                  <p class="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-muted">
                    {{ t('home.featured.emptyBody') }}
                  </p>
                  <a
                    ij-button
                    routerLink="/auth/registro/empresa"
                    size="sm"
                    class="mt-6"
                  >
                    {{ t('home.featured.emptyCta') }}
                  </a>
                </div>
              }
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class FeaturedVacancies {
  readonly vacancies = input.required<readonly PublicVacancy[]>();
  readonly state = input.required<LoadState>();

  readonly retry = output<void>();

  protected readonly skeletonRows = [0, 1, 2, 3];
}
