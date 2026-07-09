import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JobsFacade } from '@/features/public/jobs/data/jobs.facade';
import { JobDetailBanner } from '@/features/public/jobs/components/job-detail-banner/job-detail-banner';
import { JobDetailMain } from '@/features/public/jobs/components/job-detail-main/job-detail-main';

@Component({
  selector: 'app-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobDetailBanner, JobDetailMain],
  template: `
    <app-job-detail-banner [jobDetail]="facade.jobDetail()" />
    <section class="px-4 py-14 sm:px-8 lg:px-[60px] lg:py-[56px]">
      <app-job-detail-main [jobDetail]="facade.jobDetail()" />
    </section>
  `,
})
export class JobDetailPage {
  protected readonly facade = inject(JobsFacade);
}
