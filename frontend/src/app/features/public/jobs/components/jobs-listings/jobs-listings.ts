import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '@/features/public/jobs/models/jobs.models';

@Component({
  selector: 'app-jobs-listings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div>
      <div class="mb-[22px] flex flex-wrap items-center justify-between gap-[14px]">
        <p class="text-[15px] text-[#5a5a72]">
          <span class="font-semibold text-[#1a1a2e]">Showing 2,150 jobs</span>
        </p>
        <div class="flex flex-wrap items-center gap-[14px]">
          <span class="text-sm text-[#8a8a9e]">Short By</span>
          <div class="flex items-center gap-6 rounded-lg border border-[#e6e8ef] px-[14px] py-2.5 text-sm text-[#4a4a62]">Most Recent
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="flex items-center gap-6 rounded-lg border border-[#e6e8ef] px-[14px] py-2.5 text-sm text-[#4a4a62]">Show 10
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        @for (job of jobs(); track job.title; let i = $index) {
          <div class="flex flex-col gap-5 rounded-[12px] border border-[#edeff4] bg-white px-6 py-[22px] shadow-[0_14px_34px_-28px_rgba(0,0,0,.3)] sm:flex-row sm:items-center sm:gap-[22px]">
            <div class="flex h-[78px] w-[78px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-[10px]" [style.background-color]="job.logoBg">
              <div class="h-[34px] w-[34px] rounded-lg" [style.background-color]="job.logoColor"></div>
              <span class="text-[8px] font-bold tracking-[0.5px]" [style.color]="job.logoColor">{{ job.logoText }}</span>
            </div>
            <div class="flex-1">
              <div class="mb-[6px] flex flex-wrap items-center gap-2">
                <h4 class="text-base font-semibold">{{ job.title }}</h4>
                <span class="text-xs font-medium" [style.color]="job.postedColor">/ {{ job.posted }}</span>
              </div>
              <p class="mb-1 text-[13px] text-[#8a8a9e]">1363-1385 Sunset Blvd Los Angeles, CA 90026, USA</p>
              <a href="#" class="text-[13px] text-brand">https://thewebmax.com</a>
            </div>
            <div class="flex min-w-[130px] flex-col gap-3 text-left sm:items-end sm:text-right">
              <span class="inline-block rounded-md px-[13px] py-[5px] text-[11px] font-semibold" [style.background-color]="job.badgeBg" [style.color]="job.badgeColor">{{ job.badge }}</span>
              <div class="text-[15px] font-bold text-[#1a1a2e]">{{ job.salary }} <span class="text-xs font-normal text-[#8a8a9e]">/ Month</span></div>
              <a [routerLink]="['/vacantes', i + 1]" class="text-[13px] font-medium text-brand">Browse Job</a>
            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-2 mt-10">
        <button class="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border border-[#e6e8ef] bg-white text-[#8a8a9e]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="h-[38px] w-[38px] cursor-pointer rounded-full border border-[#e6e8ef] bg-white text-sm text-[#4a4a62]">1</button>
        <button class="h-[38px] w-[38px] cursor-pointer rounded-full border-0 bg-brand text-sm font-semibold text-white">2</button>
        <button class="h-[38px] w-[38px] cursor-pointer rounded-full border border-[#e6e8ef] bg-white text-sm text-[#4a4a62]">3</button>
        <span class="text-[#a0a0b4] px-1">•••</span>
        <button class="h-[38px] w-[38px] cursor-pointer rounded-full border border-[#e6e8ef] bg-white text-sm text-[#4a4a62]">5</button>
        <button class="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border border-[#e6e8ef] bg-white text-[#8a8a9e]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  `,
})
export class JobsListings {
  readonly jobs = input.required<readonly Job[]>();
}
