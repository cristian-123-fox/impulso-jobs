import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-jobs-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="relative bg-[#f5f7fb] py-16 px-15 text-center overflow-hidden">
      <div class="absolute -top-[100px] -left-[80px] w-[340px] h-[340px] rounded-full bg-radial-gradient(circle,rgba(233,108,167,.14),transparent 70%)"></div>
      <div class="absolute -top-[60px] -right-[40px] w-[420px] h-[360px] rounded-full bg-radial-gradient(circle,rgba(43,190,220,.16),transparent 68%)"></div>
      <div class="absolute top-10 left-[44%] text-[#c7ccd8] text-2xl">+</div>
      <div class="absolute bottom-10 right-[20%] text-[#2b6df4] text-2xl opacity-40">+</div>
      <div class="relative z-10">
        <h1 class="text-3xl font-bold mb-4">The Most Exciting Jobs</h1>
        <div class="text-sm text-[#8a8a9e] flex items-center justify-center gap-2">
          <a href="#" class="text-[#8a8a9e]">Home</a> <span>-</span> <a href="#">Jobs List</a>
        </div>
      </div>
    </section>
  `,
})
export class JobsBanner {}
