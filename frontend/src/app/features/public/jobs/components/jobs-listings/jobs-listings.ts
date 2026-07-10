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
          <div class="flex flex-col gap-6 rounded-[16px] border border-line bg-white px-[22px] py-[18px] shadow-[0_14px_34px_-28px_rgba(0,0,0,.22)] sm:flex-row sm:items-center sm:gap-8">
            <div
              class="flex h-[150px] w-full shrink-0 items-center justify-center rounded-[14px] border border-line bg-white p-4 sm:w-[168px]"
              [style.background-color]="job.logoBg"
            >
              @if (job.logoSrc) {
                <img
                  [src]="job.logoSrc"
                  [alt]="job.logoAlt"
                  class="h-full w-full object-contain"
                  loading="lazy"
                />
              } @else {
                <div class="flex h-full w-full flex-col items-center justify-center gap-[3px] rounded-[10px]">
                  <div class="h-[34px] w-[34px] rounded-lg" [style.background-color]="job.logoColor"></div>
                  <span class="text-[8px] font-bold tracking-[0.5px]" [style.color]="job.logoColor">{{ job.logoText }}</span>
                </div>
              }
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-[10px] flex flex-wrap items-center gap-1.5 text-[18px] leading-tight sm:text-[19px]">
                <h4 class="font-semibold text-ink-900">{{ job.title }}</h4>
                <span class="font-medium" [style.color]="job.postedColor">/ {{ job.posted }}</span>
              </div>
              <p class="mb-5 text-[13px] text-body sm:text-[14px]">
                1363-1385 Sunset Blvd Los Angeles, CA 90026, USA
              </p>
              <a href="#" class="text-[15px] font-medium text-brand hover:underline">
                https://thewebmax.com
              </a>
            </div>

            <div class="flex min-w-[150px] flex-col gap-5 text-left sm:items-end sm:text-right">
              <span
                class="inline-flex w-fit rounded-md px-[18px] py-[7px] text-[11px] font-semibold sm:self-end"
                [style.background-color]="job.badgeBg"
                [style.color]="job.badgeColor"
              >
                {{ job.badge }}
              </span>
              <div class="text-[15px] font-bold text-ink-900 sm:text-[16px]">
                {{ job.salary }}
                <span class="font-semibold text-accent-green">/ Month</span>
              </div>
              <a
                [routerLink]="['/vacantes', i + 1]"
                class="text-[15px] font-semibold text-brand hover:underline"
              >
                Browse Job
              </a>
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
        <span class="px-1 text-[#a0a0b4]">...</span>
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
