import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaintenanceIllustration } from '@/features/public/maintenance/components/maintenance-illustration/maintenance-illustration';
import { MaintenanceSocialLinks } from '@/features/public/maintenance/components/maintenance-social-links/maintenance-social-links';
import { MaintenanceFacade } from '@/features/public/maintenance/data/maintenance.facade';
import { IjLogo } from '@/shared/ui';

@Component({
  selector: 'app-maintenance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjLogo, MaintenanceSocialLinks, MaintenanceIllustration],
  template: `
    <section
      class="relative flex min-h-screen items-center overflow-hidden bg-surface"
      aria-labelledby="maintenance-title"
    >
      <div
        class="absolute left-0 top-0 h-full w-[44%] opacity-90"
        style="
          background-image: radial-gradient(#d6dae2 1.6px, transparent 1.6px);
          background-size: 20px 20px;
          -webkit-mask-image: linear-gradient(120deg, #000 20%, transparent 80%);
          mask-image: linear-gradient(120deg, #000 20%, transparent 80%);
        "
      ></div>

      <div
        class="absolute right-0 top-0 h-[60%] w-[34%] opacity-80"
        style="
          background-image: radial-gradient(#d6dae2 1.6px, transparent 1.6px);
          background-size: 20px 20px;
          -webkit-mask-image: radial-gradient(circle at 80% 20%, #000, transparent 70%);
          mask-image: radial-gradient(circle at 80% 20%, #000, transparent 70%);
        "
      ></div>

      <div
        class="relative z-10 mx-auto grid w-full max-w-[1280px] gap-14 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:px-[60px]"
      >
        <div class="flex flex-col justify-center">
          <a routerLink="/" class="mb-12 inline-flex w-fit lg:mb-16" aria-label="Volver al inicio">
            <ij-logo />
          </a>

          <p class="mb-2 text-[24px] font-semibold tracking-[-0.02em] text-ink-900">
            {{ facade.content().eyebrow }}
          </p>
          <h1
            id="maintenance-title"
            class="text-[48px] font-extrabold leading-none tracking-[-0.04em] text-accent-blue sm:text-[60px] lg:text-[66px]"
          >
            <span class="block text-ink-900">{{ facade.content().titleLead }}</span>
            {{ facade.content().titleAccent }}
          </h1>
          <p class="mt-6 max-w-[460px] text-base leading-7 text-muted">
            {{ facade.content().description }}
          </p>

          <div class="mt-9">
            <app-maintenance-social-links [socials]="facade.socials()" />
          </div>
        </div>

        <app-maintenance-illustration />
      </div>
    </section>
  `,
})
export class MaintenancePage {
  protected readonly facade = inject(MaintenanceFacade);
}
