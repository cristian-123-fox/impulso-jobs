import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjBadge, IjButton, TONE_SOFT } from '@/shared/ui';
import { JobListing } from '@/features/public/home/models/home.models';
import { SectionHeading } from '@/features/public/home/components/section-heading/section-heading';

/** Listado de vacantes destacadas. */
@Component({
  selector: 'app-job-listings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjBadge, IjButton, SectionHeading],
  template: `
    <section class="relative overflow-hidden px-6 py-16 lg:px-[60px]">
      <div
        class="pointer-events-none absolute -right-36 top-28 hidden h-[420px] w-[420px] rounded-full border-[60px] border-brand/[0.05] lg:block"
        aria-hidden="true"
      ></div>

      <div class="relative z-[1]">
        <app-section-heading eyebrow="Todas las vacantes">
          Encuentra la carrera que mereces
        </app-section-heading>

        <div class="mx-auto mt-12 flex max-w-[820px] flex-col gap-[18px]">
          @for (job of jobs(); track job.title) {
            <div
              class="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-card sm:flex-row sm:items-center sm:gap-5"
            >
              <div
                [class]="
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] text-xl font-bold ' +
                  soft[job.logoTone]
                "
              >
                {{ job.logoText }}
              </div>

              <div class="flex-1">
                <div class="mb-1 flex flex-wrap items-center gap-2">
                  <h4 class="text-base font-semibold text-ink-900">
                    {{ job.title }}
                  </h4>
                  <span class="text-xs text-muted">| {{ job.posted }}</span>
                </div>
                <p class="mb-0.5 text-[13px] text-muted">{{ job.location }}</p>
                <a href="#" class="text-[13px] text-brand">{{ job.url }}</a>
              </div>

              <div class="flex-none text-left sm:min-w-[120px] sm:text-right">
                <ij-badge [tone]="job.badgeTone" class="mb-3 inline-block">{{
                  job.badge
                }}</ij-badge>
                <div class="text-[15px] font-bold text-ink-900">
                  {{ job.salary }}
                  <span class="text-xs font-normal text-muted">/ mes</span>
                </div>
                <a href="#" class="text-xs font-medium text-brand">Ver vacante</a>
              </div>
            </div>
          }
        </div>

        <div class="mt-9 text-center">
          <a ij-button href="#" size="lg">Ver todas las vacantes</a>
        </div>
      </div>
    </section>
  `,
})
export class JobListings {
  readonly jobs = input.required<readonly JobListing[]>();
  protected readonly soft = TONE_SOFT;
}
