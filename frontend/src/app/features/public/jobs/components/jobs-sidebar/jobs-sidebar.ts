import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JobType } from '../../models/jobs.models';

@Component({
  selector: 'app-jobs-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <aside class="flex flex-col gap-6">
      <!-- Filters card -->
      <div class="bg-white border border-[#edeff4] rounded-xl p-6 shadow-[0_14px_34px_-28px_rgba(0,0,0,.3)]">
        <h5 class="text-base font-semibold mb-3">Category</h5>
        <div class="border border-[#e6e8ef] rounded-lg px-3.5 py-3 text-sm text-[#8a8a9e] flex items-center justify-between mb-5">All Category 
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
        </div>

        <h5 class="text-base font-semibold mb-3">Keyword</h5>
        <div class="relative mb-5">
          <input placeholder="Job Title or Keyword" class="w-full border border-[#e6e8ef] rounded-lg px-3.5 py-3 text-sm outline-none">
          <svg class="absolute right-3.5 top-3.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        </div>

        <h5 class="text-base font-semibold mb-3">Location</h5>
        <div class="relative mb-6">
          <input placeholder="Search location" class="w-full border border-[#e6e8ef] rounded-lg px-3.5 py-3 text-sm outline-none">
          <svg class="absolute right-3.5 top-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="2"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        </div>

        <h5 class="text-base font-semibold mb-3.5">Job Type</h5>
        <div class="flex flex-col gap-3 mb-6">
          @for (jt of jobTypes(); track jt.name) {
            <label class="flex items-center justify-between text-sm text-[#5a5a72] cursor-pointer">
              <span class="flex items-center gap-2"><span class="w-4 h-4 border-1.5 border-[#cdd2dd] rounded-sm inline-block"></span>{{ jt.name }}</span>
              <span class="text-[#a0a0b4] text-xs">{{ jt.count }}</span>
            </label>
          }
        </div>

        <h5 class="text-base font-semibold mb-3.5">Date Posts</h5>
        <div class="flex flex-col gap-3">
          @for (dp of datePosts(); track dp) {
            <label class="flex items-center gap-2 text-sm text-[#5a5a72] cursor-pointer"><span class="w-3.5 h-3.5 border-1.5 border-[#cdd2dd] rounded-full inline-block"></span>{{ dp }}</label>
          }
        </div>

        <h5 class="text-base font-semibold my-6 mb-3.5">Type of employment</h5>
        <div class="flex flex-col gap-3">
          @for (e of employment(); track e) {
            <label class="flex items-center gap-2 text-sm text-[#5a5a72] cursor-pointer"><span class="w-3.5 h-3.5 border-1.5 border-[#cdd2dd] rounded-full inline-block"></span>{{ e }}</label>
          }
        </div>

        <div class="flex items-center gap-2 my-6 mb-4"><span class="w-1 h-4.5 bg-[#2b6df4] rounded-sm"></span><h5 class="text-base font-semibold">Tags</h5></div>
        <div class="flex flex-wrap gap-2">
          @for (tag of tags(); track tag) {
            <span class="bg-[#eef2fb] text-[#4a6fb0] text-xs px-3 py-1.5 rounded-md cursor-pointer">{{ tag }}</span>
          }
        </div>
      </div>

      <!-- Recruiting card (blue) -->
      <div class="bg-gradient-to-br from-[#2b6df4] to-[#1d51c9] rounded-xl p-6 text-white">
        <h5 class="text-base font-semibold text-white mb-4">Recruiting?</h5>
        <div class="flex flex-col gap-3 mb-5.5">
          @for (r of recruiting(); track r) {
            <label class="flex items-center gap-2 text-sm text-white/90 cursor-pointer"><span class="w-3.5 h-3.5 border-1.5 border-white/70 rounded-full inline-block"></span>{{ r }}</label>
          }
        </div>
        <div class="flex items-center gap-2 mb-4"><span class="w-1 h-4.5 bg-white rounded-sm"></span><h5 class="text-base font-semibold text-white">Tags</h5></div>
        <div class="flex flex-wrap gap-2">
          @for (tag of tags(); track tag) {
            <span class="bg-white/16 text-white text-xs px-3 py-1.5 rounded-md cursor-pointer">{{ tag }}</span>
          }
        </div>
      </div>

      <!-- Recruiting CTA -->
      <div class="relative rounded-xl overflow-hidden p-7.5 text-white bg-gradient-to-br from-[#2b6df4] to-[#123a9e]">
        <div class="absolute inset-0 opacity-25 bg-radial-gradient(circle at 80% 30%,rgba(255,255,255,.4),transparent 55%)"></div>
        <div class="relative">
          <h4 class="text-xl font-semibold text-white mb-3">Recruiting?</h4>
          <p class="text-sm text-white/90 leading-7 mb-6">Get Best Matched Jobs On your Email. Add Resume NOW!</p>
          <button class="bg-white text-[#2b6df4] border-none rounded-lg px-6.5 py-3 text-sm font-semibold font-inherit cursor-pointer">Read More</button>
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
