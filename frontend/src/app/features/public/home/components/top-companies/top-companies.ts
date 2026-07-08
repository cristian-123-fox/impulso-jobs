import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { Company, Stat } from '../../models/home.models';
import { SectionHeading } from '../section-heading/section-heading';

/** Sección de empresas destacadas + franja de estadísticas de la plataforma. */
@Component({
  selector: 'app-top-companies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, SectionHeading],
  template: `
    <section class="px-6 pb-8 pt-16 lg:px-[60px]">
      <app-section-heading eyebrow="Empresas destacadas">
        Consigue empleo en las mejores empresas
      </app-section-heading>

      <div class="mx-auto mt-11 flex max-w-[1000px] items-center gap-4 sm:gap-5">
        <button
          ij-button
          type="button"
          shape="circle"
          class="shrink-0"
          aria-label="Anterior"
        >
          <ij-icon name="chevron-left" [size]="14" [strokeWidth]="2.5" />
        </button>

        <div class="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          @for (company of companies(); track company.name) {
            <div class="flex flex-col items-center gap-3">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-body"
              >
                <ij-icon [name]="company.icon" [size]="26" [strokeWidth]="1.8" />
              </div>
              <span class="text-[13px] font-medium text-body">{{
                company.name
              }}</span>
            </div>
          }
        </div>

        <button
          ij-button
          type="button"
          shape="circle"
          class="shrink-0"
          aria-label="Siguiente"
        >
          <ij-icon name="chevron-right" [size]="14" [strokeWidth]="2.5" />
        </button>
      </div>

      <!-- Franja de estadísticas -->
      <div
        class="mx-auto mt-14 grid max-w-[640px] grid-cols-1 rounded-xl bg-white px-10 py-6 shadow-card sm:grid-cols-3"
      >
        @for (stat of stats(); track stat.label; let last = $last) {
          <div
            class="px-2 py-2 text-center sm:text-left"
            [class.sm:border-r]="!last"
            [class.border-line]="!last"
          >
            <div class="text-[30px] font-bold text-brand">{{ stat.value }}</div>
            <div class="text-[13px] text-muted">{{ stat.label }}</div>
          </div>
        }
      </div>
    </section>
  `,
})
export class TopCompanies {
  readonly companies = input.required<readonly Company[]>();
  readonly stats = input.required<readonly Stat[]>();
}
