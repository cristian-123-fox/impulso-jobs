import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaintenanceSocialLink } from '@/features/public/maintenance/models/maintenance.models';

@Component({
  selector: 'app-maintenance-social-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-3">
      @for (social of socials(); track social.label) {
        <a
          [href]="social.href"
          target="_blank"
          rel="noreferrer"
          [attr.aria-label]="social.label"
          class="flex h-[46px] w-[46px] items-center justify-center rounded-[10px] bg-white text-brand shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand hover:text-white hover:shadow-float"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true">
            <path [attr.d]="social.path" />
          </svg>
        </a>
      }
    </div>
  `,
})
export class MaintenanceSocialLinks {
  readonly socials = input.required<readonly MaintenanceSocialLink[]>();
}
