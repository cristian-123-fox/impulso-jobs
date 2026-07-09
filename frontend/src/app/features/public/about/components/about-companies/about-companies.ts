import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { AboutCompany } from '@/features/public/about/models/about.models';

@Component({
  selector: 'app-about-companies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton, IjIcon],
  template: `
    <section class="px-6 pb-[90px] pt-[70px] text-center lg:px-[60px]">
      <p class="mb-2 text-[15px] font-semibold text-accent-blue">Empresas top</p>
      <h2 class="mb-11 text-[34px] font-bold text-ink-900">
        Consigue empleo en grandes compañías
      </h2>

      <div class="mx-auto flex max-w-[1000px] items-center gap-[18px] justify-center">
        <button
          ij-button
          type="button"
          variant="accent"
          shape="circle"
          size="md"
          aria-label="Anterior"
          class="shrink-0"
        >
          <ij-icon name="chevron-left" [size]="14" [strokeWidth]="2.5" />
        </button>

        <div class="grid flex-1 grid-cols-2 gap-[14px] sm:grid-cols-3 lg:grid-cols-6">
          @for (company of companies(); track company.name) {
            <div class="flex flex-col items-center gap-2.5">
              <div
                class="flex h-[52px] w-[52px] items-center justify-center text-body"
              >
                <ij-icon [name]="company.icon" [size]="28" [strokeWidth]="1.8" />
              </div>
              <span class="text-[13px] font-semibold text-ink-900">{{
                company.name
              }}</span>
              <span class="text-[9px] tracking-[0.16em] text-muted">
                TU MARCA AQUÍ
              </span>
            </div>
          }
        </div>

        <button
          ij-button
          type="button"
          variant="accent"
          shape="circle"
          size="md"
          aria-label="Siguiente"
          class="shrink-0"
        >
          <ij-icon name="chevron-right" [size]="14" [strokeWidth]="2.5" />
        </button>
      </div>
    </section>
  `,
})
export class AboutCompanies {
  readonly companies = input.required<readonly AboutCompany[]>();
}
