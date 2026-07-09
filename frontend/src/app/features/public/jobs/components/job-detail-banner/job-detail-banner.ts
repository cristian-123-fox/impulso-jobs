import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JobDetail } from '@/features/public/jobs/models/jobs.models';

@Component({
  selector: 'app-job-detail-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="relative bg-[#f5f7fb] py-16 px-15 text-center overflow-hidden">
      <div class="absolute -top-[100px] -left-[80px] w-[340px] h-[340px] rounded-full bg-radial-gradient(circle,rgba(233,108,167,.14),transparent 70%)"></div>
      <div class="absolute -top-[60px] -right-[40px] w-[420px] h-[360px] rounded-full bg-radial-gradient(circle,rgba(43,190,220,.16),transparent 68%)"></div>
      <div class="relative z-10">
        <h1 class="text-3xl font-bold mb-4">{{ jobDetail().title }}</h1>
        <div class="text-sm text-[#8a8a9e] flex items-center justify-center gap-2">
          <a href="#" class="text-[#8a8a9e]">Home</a> <span>-</span> <a href="#">Job Detail</a>
        </div>
      </div>
    </section>
  `,
})
export class JobDetailBanner {
  readonly jobDetail = input.required<JobDetail>();
}
