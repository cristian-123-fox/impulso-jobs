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
  templateUrl: './job-detail-main.html',
})
export class JobDetailMain {
  readonly jobDetail = input.required<JobDetail>();

  getOfficePhotoBackground(index: number): string {
    const backgrounds = [
      'linear-gradient(135deg,#fff2e8,#f8efe6)',
      'linear-gradient(135deg,#f8e0d4,#fff2e8)',
      'linear-gradient(135deg,#d9e8d9,#fef3e6)',
      'linear-gradient(135deg,#f7e3eb,#fff2e8)',
    ];
    return backgrounds[index % backgrounds.length];
  }

  getIconSvg(icon: string): string {
    const path = iconPaths[icon] || '';
    return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }
}
