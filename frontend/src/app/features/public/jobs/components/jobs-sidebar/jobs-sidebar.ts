import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JobType } from '@/features/public/jobs/models/jobs.models';

@Component({
  selector: 'app-jobs-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <aside class="flex flex-col gap-6">
      <!-- Filters card -->
      <div
        class="rounded-[12px] border border-[#edeff4] bg-white px-6 py-[26px] shadow-[0_14px_34px_-26px_rgba(0,0,0,.18)]"
      >
        <h5 class="text-base font-semibold mb-3">Category</h5>
        <div class="mb-[22px] flex items-center justify-between rounded-lg border border-[#e6e8ef] px-[14px] py-3 text-sm text-[#8a8a9e]">
          All Category
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
        </div>

        <h5 class="text-base font-semibold mb-3">Keyword</h5>
        <div class="relative mb-[22px]">
          <input placeholder="Job Title or Keyword" class="w-full rounded-lg border border-[#e6e8ef] px-[14px] py-3 pr-10 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/15">
          <svg class="absolute right-[14px] top-[13px]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        </div>

        <h5 class="text-base font-semibold mb-3">Location</h5>
        <div class="relative mb-6">
          <input placeholder="Search location" class="w-full rounded-lg border border-[#e6e8ef] px-[14px] py-3 pr-10 text-sm outline-none focus:border-brand/30 focus:ring-2 focus:ring-brand/15">
          <svg class="absolute right-[13px] top-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6a00" stroke-width="2"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        </div>

        <h5 class="mb-[14px] text-base font-semibold">Job Type</h5>
        <div class="flex flex-col gap-3 mb-6">
          @for (jt of jobTypes(); track jt.name) {
            <label class="flex items-center justify-between text-sm text-[#5a5a72] cursor-pointer">
              <span class="flex items-center gap-[9px]"><span class="inline-block h-4 w-4 rounded-[4px] border-[1.5px] border-[#cdd2dd]"></span>{{ jt.name }}</span>
              <span class="text-[#a0a0b4] text-xs">{{ jt.count }}</span>
            </label>
          }
        </div>

        <h5 class="mb-[14px] text-base font-semibold">Date Posts</h5>
        <div class="flex flex-col gap-3">
          @for (dp of datePosts(); track dp) {
            <label class="flex items-center gap-[9px] text-sm text-[#5a5a72] cursor-pointer"><span class="inline-block h-[15px] w-[15px] rounded-full border-[1.5px] border-[#cdd2dd]"></span>{{ dp }}</label>
          }
        </div>

        <h5 class="mb-[14px] mt-6 text-base font-semibold">Type of employment</h5>
        <div class="flex flex-col gap-3">
          @for (e of employment(); track e) {
            <label class="flex items-center gap-[9px] text-sm text-[#5a5a72] cursor-pointer"><span class="inline-block h-[15px] w-[15px] rounded-full border-[1.5px] border-[#cdd2dd]"></span>{{ e }}</label>
          }
        </div>

        <div class="mb-4 mt-[26px] flex items-center gap-2"><span class="h-[18px] w-1 rounded-sm bg-brand"></span><h5 class="text-base font-semibold">Tags</h5></div>
        <div class="flex flex-wrap gap-[9px]">
          @for (tag of tags(); track tag) {
            <span class="cursor-pointer rounded-[5px] bg-brand-50 px-3 py-[6px] text-xs text-brand">{{ tag }}</span>
          }
        </div>
      </div>

      <div class="rounded-[12px] bg-gradient-to-br from-brand to-brand-600 px-6 py-[26px] text-white">
        <h5 class="text-base font-semibold text-white mb-4">Recruiting?</h5>
        <div class="mb-[22px] flex flex-col gap-[13px]">
          @for (r of recruiting(); track r) {
            <label class="flex items-center gap-[9px] text-sm text-white/90 cursor-pointer"><span class="inline-block h-[15px] w-[15px] rounded-full border-[1.5px] border-white/70"></span>{{ r }}</label>
          }
        </div>
        <div class="mb-4 flex items-center gap-2"><span class="h-[18px] w-1 rounded-sm bg-white"></span><h5 class="text-base font-semibold text-white">Tags</h5></div>
        <div class="flex flex-wrap gap-[9px]">
          @for (tag of tags(); track tag) {
            <span class="cursor-pointer rounded-[5px] bg-white/15 px-3 py-[6px] text-xs text-white">{{ tag }}</span>
          }
        </div>
      </div>

      <!-- Recruiting CTA -->
      <div class="relative overflow-hidden rounded-[12px] bg-gradient-to-br from-brand to-brand-600 px-[26px] py-[30px] text-white">
        <div
          class="absolute inset-0 opacity-25"
          style="background: radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.4), transparent 55%);"
        ></div>
        <div class="relative">
          <h4 class="text-xl font-semibold text-white mb-3">Recruiting?</h4>
          <p class="mb-6 text-sm leading-[1.6] text-white/90">Get Best Matched Jobs On your Email. Add Resume NOW!</p>
          <button class="cursor-pointer rounded-lg border-0 bg-white px-[26px] py-3 text-sm font-semibold text-brand">Read More</button>
        </div>
      </div>
    </aside>
  `,
})
export class JobsSidebar {
  readonly jobTypes = input.required<readonly JobType[]>();
  readonly datePosts = input.required<readonly string[]>();
  readonly employment = input.required<readonly string[]>();
  readonly recruiting = input.required<readonly string[]>();
  readonly tags = input.required<readonly string[]>();
}
