import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../models/jobs.models';

@Component({
  selector: 'app-jobs-listings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div>
      <div class="flex items-center justify-between mb-5.5 flex-wrap gap-3.5">
        <p class="text-sm text-[#5a5a72]"><span class="font-semibold text-[#1a1a2e]">Showing 2,150 jobs</span></p>
        <div class="flex items-center gap-3.5">
          <span class="text-sm text-[#8a8a9e]">Short By</span>
          <div class="border border-[#e6e8ef] rounded-lg px-3.5 py-2.5 text-sm text-[#4a4a62] flex items-center gap-6">Most Recent
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="border border-[#e6e8ef] rounded-lg px-3.5 py-2.5 text-sm text-[#4a4a62] flex items-center gap-6">Show 10
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        @for (job of jobs(); track job.title; let i = $index) {
          <div class="bg-white border border-[#edeff4] rounded-xl shadow-[0_14px_34px_-28px_rgba(0,0,0,.3)] p-5.5 flex items-center gap-5.5">
            <div class="w-[78px] h-[78px] rounded-xl flex flex-col items-center justify-center flex-none gap-0.75" [style.background-color]="job.logoBg">
              <div class="w-8.5 h-8.5 rounded-lg" [style.background-color]="job.logoColor"></div>
              <span class="text-[8px] font-bold tracking-[0.5px]" [style.color]="job.logoColor">{{ job.logoText }}</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                <h4 class="text-base font-semibold">{{ job.title }}</h4>
                <span class="text-xs font-medium" [style.color]="job.postedColor">/ {{ job.posted }}</span>
              </div>
              <p class="text-sm text-[#8a8a9e] mb-1">1363-1385 Sunset Blvd Los Angeles, CA 90026, USA</p>
              <a href="#" class="text-sm text-[#2b6df4]">https://thewebmax.com</a>
            </div>
            <div class="text-right flex-none min-w-[130px] flex flex-col items-end gap-3">
              <span class="inline-block text-xs font-semibold px-3.25 py-1.25 rounded-md" [style.background-color]="job.badgeBg" [style.color]="job.badgeColor">{{ job.badge }}</span>
              <div class="text-lg font-bold text-[#1a1a2e]">{{ job.salary }} <span class="text-sm font-normal text-[#8a8a9e]">/ Month</span></div>
              <a [routerLink]="['/vacantes', i + 1]" class="text-sm text-[#2b6df4] font-medium">Browse Job</a>
            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-2 mt-10">
        <button class="w-9.5 h-9.5 rounded-full border border-[#e6e8ef] bg-white text-[#8a8a9e] cursor-pointer flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="w-9.5 h-9.5 rounded-full border border-[#e6e8ef] bg-white text-[#4a4a62] cursor-pointer font-inherit text-sm">1</button>
        <button class="w-9.5 h-9.5 rounded-full border-none bg-[#2b6df4] text-white cursor-pointer font-inherit text-sm font-semibold">2</button>
        <button class="w-9.5 h-9.5 rounded-full border border-[#e6e8ef] bg-white text-[#4a4a62] cursor-pointer font-inherit text-sm">3</button>
        <span class="text-[#a0a0b4] px-1">•••</span>
        <button class="w-9.5 h-9.5 rounded-full border border-[#e6e8ef] bg-white text-[#4a4a62] cursor-pointer font-inherit text-sm">5</button>
        <button class="w-9.5 h-9.5 rounded-full border border-[#e6e8ef] bg-white text-[#8a8a9e] cursor-pointer flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  `,
})
export class JobsListings {
  readonly jobs = input.required<readonly Job[]>();
}
