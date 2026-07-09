import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JobDetail } from '@/features/public/jobs/models/jobs.models';

@Component({
  selector: 'app-job-detail-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="relative overflow-hidden bg-surface px-4 py-16 text-center sm:px-8 lg:px-[60px] lg:py-[64px]">
      <div class="absolute -left-[80px] -top-[100px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(233,108,167,.14),transparent_70%)]"></div>
      <div class="absolute -right-[40px] -top-[60px] h-[360px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,106,0,.12),transparent_68%)]"></div>
      <div class="relative z-10">
        <h1 class="mb-[14px] text-[34px] font-bold leading-tight text-ink-900">{{ jobDetail().title }}</h1>
        <div class="flex items-center justify-center gap-2 text-sm text-[#6b6b82]">
          <a href="/" class="text-[#6b6b82] transition-colors hover:text-brand">Home</a>
          <span>-</span>
          <a href="/vacantes" class="transition-colors hover:text-brand">Job Detail</a>
        </div>
      </div>
    </section>
  `,
})
export class JobDetailBanner {
  readonly jobDetail = input.required<JobDetail>();
}
