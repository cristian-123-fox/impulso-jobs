import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon, TONE_SOFT } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { HomeArea } from '@/features/public/home/models/home.models';
import { SectionHeading } from '@/features/public/home/components/section-heading/section-heading';

/**
 * Índice de áreas profesionales. Ocho áreas más la puerta a las 23 del
 * catálogo: nueve celdas para nueve destinos, sin huecos ni relleno.
 *
 * Se retiraron las flechas de carrusel: no tenían handler, así que eran dos
 * botones que no hacían nada. Una rejilla no necesita paginarse.
 */
@Component({
  selector: 'app-job-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, RouterLink, SectionHeading, IjReveal, TranslocoDirective],
  template: `
    <section *transloco="let t" class="bg-surface px-6 py-[72px] lg:px-[60px]">
      <div class="mx-auto max-w-[1180px]">
        <app-section-heading
          align="left"
          [eyebrow]="t('home.categories.eyebrow')"
          [lead]="t('home.categories.lead')"
        >
          {{ t('home.categories.title') }}
        </app-section-heading>

        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (area of areas(); track area.areaId; let i = $index) {
            <a
              ijReveal
              [revealDelay]="i * 55"
              [routerLink]="['/vacantes']"
              [queryParams]="{ area: area.areaId }"
              class="group flex items-center gap-4 rounded-xl bg-white p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
            >
              <span
                [class]="
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ' +
                  soft[area.tone]
                "
              >
                <ij-icon [name]="area.icon" [size]="24" [strokeWidth]="1.8" />
              </span>
              <span class="min-w-0">
                <!-- El nombre del área es catálogo (T15): no se traduce. -->
                <span class="block text-[15px] font-semibold text-ink-900">
                  {{ area.name }}
                </span>
                <span
                  class="mt-0.5 block text-[13px] text-muted transition-colors group-hover:text-brand-strong"
                >
                  {{ t('home.categories.viewVacancies') }}
                </span>
              </span>
            </a>
          }

          <!-- Novena celda: la salida al catálogo completo, no un hueco. -->
          <a
            ijReveal
            [revealDelay]="areas().length * 55"
            routerLink="/vacantes"
            class="flex items-center gap-4 rounded-xl bg-ink-950 p-5 text-white shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
          >
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10"
            >
              <ij-icon name="search" [size]="24" [strokeWidth]="1.8" />
            </span>
            <span>
              <span class="block text-[15px] font-semibold">
                {{ t('home.categories.allAreas') }}
              </span>
              <span class="mt-0.5 block text-[13px] text-white/70">
                {{ t('home.categories.allAreasHint') }}
              </span>
            </span>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class JobCategories {
  readonly areas = input.required<readonly HomeArea[]>();
  protected readonly soft = TONE_SOFT;
}
