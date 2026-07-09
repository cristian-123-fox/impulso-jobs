import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JobsBanner } from '@/features/public/jobs/components/jobs-banner/jobs-banner';
import { JobsListings } from '@/features/public/jobs/components/jobs-listings/jobs-listings';
import { JobsSidebar } from '@/features/public/jobs/components/jobs-sidebar/jobs-sidebar';
import { JobsFacade } from '@/features/public/jobs/data/jobs.facade';

@Component({
  selector: 'app-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobsBanner, JobsSidebar, JobsListings],
  template: `
    <app-jobs-banner />
    <section class="px-6 py-11 lg:px-[60px] lg:py-[44px]">
      <div
        class="mx-auto grid max-w-[1200px] items-start gap-8 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-[34px]"
      >
        <app-jobs-sidebar
          [jobTypes]="facade.jobTypes()"
          [datePosts]="facade.datePosts()"
          [employment]="facade.employment()"
          [recruiting]="facade.recruiting()"
          [tags]="facade.tags()"
        />
        <app-jobs-listings [jobs]="facade.jobs()" />
      </div>
    </section>
  `,
})
export class JobsPage {
  protected readonly facade = inject(JobsFacade);
}
