import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JobsFacade } from '../../data/jobs.facade';
import { JobsBanner } from '../../components/jobs-banner/jobs-banner';
import { JobsSidebar } from '../../components/jobs-sidebar/jobs-sidebar';
import { JobsListings } from '../../components/jobs-listings/jobs-listings';

@Component({
  selector: 'app-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobsBanner, JobsSidebar, JobsListings],
  template: `
    <app-jobs-banner />
    <section class="py-11 px-15">
      <div class="max-w-6xl mx-auto grid grid-cols-[290px_1fr] gap-8.5 items-start">
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
