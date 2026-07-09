import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JobDetail } from '@/features/public/jobs/models/jobs.models';

const iconPaths: Record<string, string> = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  pin: '<path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gender: '<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h4M2 10h20"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'
};

@Component({
  selector: 'app-job-detail-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-9 items-start">
      <div>
        <div class="relative rounded-xl overflow-hidden h-[300px] mb-3 bg-[#e8ebf0]">
          <span class="absolute top-4 left-4 bg-[#1fae6a] text-white text-xs font-semibold px-3.5 py-1.5 rounded-md z-10">{{ jobDetail().badge }}</span>
        </div>
        <div class="flex items-center justify-between -mt-[52px] px-2 relative z-10">
          <div class="w-[72px] h-[72px] rounded-xl bg-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.75">
            <div class="w-[30px] h-[30px] rounded-md" [style.background-color]="jobDetail().logoColor"></div>
            <span class="text-[7px] font-bold" [style.color]="jobDetail().logoColor">{{ jobDetail().logoText }}</span>
          </div>
        </div>
        <div class="flex items-start justify-between mt-4.5">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold">Senior Web Designer, Developer</h3>
              <span class="text-sm text-[#1fae6a] font-medium">/ {{ jobDetail().posted }}</span>
            </div>
            <p class="text-sm text-[#8a8a9e] flex items-center gap-1.5 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="2">
                <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/>
                <circle cx="12" cy="10" r="2.5"/>
              </svg>
              {{ jobDetail().location }}
            </p>
          </div>
          <button class="bg-[#2b6df4] text-white border-none rounded-lg px-7 py-3.5 text-sm font-medium font-inherit cursor-pointer whitespace-nowrap hover:bg-[#1d51c9]">Apply Now</button>
        </div>
        <div class="flex items-center justify-between py-3.5 border-b border-[#eceef3] mb-7">
          <div class="text-sm">
            <a href="#" class="text-[#2b6df4]">{{ jobDetail().website }}</a>
            <span class="text-[#1a1a2e] font-semibold ml-2.5">{{ jobDetail().salary }}</span>
            <span class="text-[#8a8a9e]"> / Month</span>
          </div>
          <div class="text-sm text-[#8a8a9e]">
            Application ends: <span class="text-[#e8443b] font-medium">{{ jobDetail().deadline }}</span>
          </div>
        </div>

        <h4 class="text-lg font-semibold mb-4">Job Description:</h4>
        @for (paragraph of jobDetail().description; track paragraph) {
          <p class="text-sm text-[#8a8a9e] leading-[1.8] mb-4.5">{{ paragraph }}</p>
        }

        <h4 class="text-lg font-semibold mb-4.5">Requirements:</h4>
        <div class="flex flex-col gap-3.75 mb-7.5">
          @for (req of jobDetail().requirements; track req) {
            <div class="flex gap-3 items-start">
              <svg class="mt-0.5 flex-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <p class="text-sm text-[#4a4a62] leading-[1.6]">{{ req }}</p>
            </div>
          }
        </div>

        <h4 class="text-lg font-semibold mb-4.5">Responsibilities:</h4>
        <div class="flex flex-col gap-3.75 mb-8">
          @for (resp of jobDetail().responsibilities; track resp) {
            <div class="flex gap-3 items-start">
              <svg class="mt-0.5 flex-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <p class="text-sm text-[#4a4a62] leading-[1.6]">{{ resp }}</p>
            </div>
          }
        </div>

        <h4 class="text-lg font-semibold mb-4">Share Profile</h4>
        <div class="flex gap-2.5 flex-wrap mb-8.5">
          @for (share of jobDetail().shares; track share.name) {
            <span class="text-sm font-medium px-4.5 py-2.25 rounded-md cursor-pointer text-white" [style.background-color]="share.bg">{{ share.name }}</span>
          }
        </div>

        <h4 class="text-lg font-semibold mb-4">Location</h4>
        <div class="relative rounded-lg overflow-hidden h-[340px] mb-10 bg-[#e8ebf0]">
          <div class="absolute inset-0" style="background: repeating-linear-gradient(90deg,transparent 0 78px,#dfe3ea 78px 80px), repeating-linear-gradient(0deg,transparent 0 58px,#dfe3ea 58px 60px);"></div>
          <div class="absolute top-[30%] -left-[10%] w-[130%] h-[22px] bg-[#d0d5df] -rotate-8"></div>
          <div class="absolute top-[55%] -left-[10%] w-[130%] h-4 bg-[#cfe3c9] rotate-6"></div>
          <div class="absolute top-4 left-4 bg-white rounded-md shadow-[0_6px_16px_-8px_rgba(0,0,0,0.3)] px-3.5 py-2.5 text-sm">
            <div class="font-semibold text-[#1a1a2e] mb-0.5">1363 Sunset Blvd</div>
            <div class="text-xs text-[#8a8a9e]">1363 Sunset Blvd, Los Angeles,...</div>
          </div>
          <svg class="absolute top-[44%] left-[40%]" width="34" height="44" viewBox="0 0 24 32" fill="#e8443b">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/>
            <circle cx="12" cy="12" r="5" fill="#fff"/>
          </svg>
          <div class="absolute bottom-3 right-3.5 w-8.5 h-8.5 rounded-full bg-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#5a5a72]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8.5">
          <div>
            <h4 class="text-lg font-semibold mb-4">Office Photos</h4>
            <div class="grid grid-cols-4 gap-2">
              @for (photo of jobDetail().officePhotos; track photo) {
                <div class="rounded-md overflow-hidden aspect-square bg-[#e8ebf0]"></div>
              }
            </div>
          </div>
          <div>
            <h4 class="text-lg font-semibold mb-4">Video</h4>
            <div class="relative rounded-lg overflow-hidden h-[210px] bg-[#e8ebf0]">
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-[58px] h-[58px] rounded-full bg-white/90 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#2b6df4">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="flex flex-col gap-6.5">
        <div class="bg-white border border-[#edeff4] rounded-xl p-6.5 shadow-[0_16px_38px_-30px_rgba(0,0,0,0.3)]">
          <h4 class="text-lg font-semibold mb-5 pb-3.5 border-b border-[#eceef3]">Job Information</h4>
          <div class="flex flex-col gap-3 mb-5.5">
            <div class="border border-[#eceef3] rounded-lg px-3.5 py-3 text-sm text-[#4a4a62] flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#2b6df4">
                <rect x="3" y="4" width="18" height="18" rx="2" opacity=".3"/>
                <path d="M3 9h18M8 2v4M16 2v4" stroke="#2b6df4" stroke-width="2" fill="none"/>
              </svg>
              Date Posted
            </div>
            <div class="border border-[#eceef3] rounded-lg px-3.5 py-3 text-sm text-[#4a4a62] flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="2">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              8160 Views
            </div>
            <div class="border border-[#eceef3] rounded-lg px-3.5 py-3 text-sm text-[#4a4a62] flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6df4" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6M9 15l2 2 4-4"/>
              </svg>
              6 Applicants
            </div>
          </div>
          <div class="flex flex-col gap-4.5">
            @for (info of jobDetail().jobInfo; track info.label) {
              <div class="flex gap-3.25 items-start">
                <div class="text-[#2b6df4] flex-none mt-0.25" [innerHTML]="getIconSvg(info.icon)"></div>
                <div>
                  <div class="text-xs text-[#9a9ab0] mb-0.5">{{ info.label }}</div>
                  <div class="text-sm font-medium text-[#1a1a2e]">{{ info.value }}</div>
                </div>
              </div>
            }
          </div>

          <div class="flex items-center gap-2 my-6.5 mb-4">
            <span class="w-1 h-4.5 bg-[#2b6df4] rounded-sm"></span>
            <h4 class="text-lg font-semibold">Job Skills</h4>
          </div>
          <div class="flex flex-wrap gap-2.25">
            @for (skill of jobDetail().skills; track skill) {
              <span class="bg-[#eef2fb] text-[#4a6fb0] text-xs px-3.25 py-1.5 rounded-md cursor-pointer">{{ skill }}</span>
            }
          </div>
        </div>

        <div class="relative bg-white border border-[#edeff4] rounded-xl p-6.5 shadow-[0_16px_38px_-30px_rgba(0,0,0,0.3)] mt-5">
          <div class="absolute -top-6 left-6 w-15 h-15 rounded-xl bg-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-0.5">
            <div class="w-6.5 h-6.5 rounded-md" [style.background-color]="jobDetail().logoColor"></div>
            <span class="text-[6px] font-bold" [style.color]="jobDetail().logoColor">{{ jobDetail().logoText }}</span>
          </div>
          <h4 class="text-base font-semibold my-10 mb-4.5">Senior Web Designer, Developer</h4>
          <div class="flex flex-col gap-4 mb-5.5">
            @for (contact of jobDetail().contact; track contact.label) {
              <div class="flex gap-3.25 items-start">
                <div class="text-[#2b6df4] flex-none mt-0.25" [innerHTML]="getIconSvg(contact.icon)"></div>
                <div>
                  <div class="text-xs text-[#9a9ab0] mb-0.5">{{ contact.label }}</div>
                  <div class="text-sm font-medium text-[#1a1a2e] leading-[1.5]">{{ contact.value }}</div>
                </div>
              </div>
            }
          </div>
          <button class="w-full bg-[#2b6df4] text-white border-none rounded-lg px-3.5 py-3.5 text-sm font-semibold font-inherit cursor-pointer hover:bg-[#1d51c9]">View Profile</button>
        </div>

        <div class="relative rounded-xl overflow-hidden p-7 text-white bg-gradient-to-br from-[#2b6df4] to-[#123a9e]">
          <div class="absolute inset-0 opacity-70" style="background: radial-gradient(circle at 85% 30%,rgba(255,255,255,.4),transparent 55%);"></div>
          <div class="relative">
            <h4 class="text-lg font-semibold text-white mb-3">Recruiting?</h4>
            <p class="text-sm text-white/90 leading-[1.6] mb-5.5">Get Best Matched Jobs On your Email. Add Resume NOW!</p>
            <button class="bg-white text-[#2b6df4] border-none rounded-lg px-6.5 py-3 text-sm font-semibold font-inherit cursor-pointer">Read More</button>
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class JobDetailMain {
  readonly jobDetail = input.required<JobDetail>();

  getIconSvg(icon: string): string {
    const path = iconPaths[icon] || '';
    return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }
}
