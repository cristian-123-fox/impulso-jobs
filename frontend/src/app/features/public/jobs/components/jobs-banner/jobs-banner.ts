import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-jobs-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section
      class="relative overflow-hidden bg-surface px-6 py-16 text-center lg:px-[60px] lg:py-[64px]"
    >
      <div
        class="absolute -left-[80px] -top-[100px] h-[340px] w-[340px] rounded-full"
        style="background: radial-gradient(circle, rgba(233, 108, 167, 0.14), transparent 70%);"
      ></div>
      <div
        class="absolute -right-[40px] -top-[60px] h-[360px] w-[420px] rounded-full"
        style="background: radial-gradient(circle, rgba(43, 190, 220, 0.16), transparent 68%);"
      ></div>
      <div class="absolute left-[44%] top-10 text-2xl text-[#c7ccd8]">+</div>
      <div class="absolute bottom-10 right-[20%] text-[26px] text-brand opacity-40">+</div>

      <div class="relative z-10">
        <h1 class="mb-[14px] text-[34px] font-bold leading-tight text-ink-900">
          The Most Exciting Jobs
        </h1>
        <nav
          aria-label="Breadcrumb"
          class="flex items-center justify-center gap-2 text-sm text-[#6b6b82]"
        >
          <a routerLink="/" class="text-[#6b6b82] transition-colors hover:text-brand">
            Home
          </a>
          <span>-</span>
          <span class="text-brand">Jobs List</span>
        </nav>
      </div>
    </section>
  `,
})
export class JobsBanner {}
