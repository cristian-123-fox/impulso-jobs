import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AboutCategories } from '@/features/public/about/components/about-categories/about-categories';
import { AboutCompanies } from '@/features/public/about/components/about-companies/about-companies';
import { AboutCta } from '@/features/public/about/components/about-cta/about-cta';
import { AboutHero } from '@/features/public/about/components/about-hero/about-hero';
import { AboutSteps } from '@/features/public/about/components/about-steps/about-steps';
import { AboutFacade } from '@/features/public/about/data/about.facade';

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutHero, AboutCategories, AboutSteps, AboutCta, AboutCompanies],
  template: `
    <app-about-hero [content]="facade.hero()" />
    <app-about-categories [categories]="facade.categories()" />
    <app-about-steps [bullets]="facade.bullets()" [steps]="facade.steps()" />
    <app-about-cta [content]="facade.cta()" />
    <app-about-companies [companies]="facade.companies()" />
  `,
})
export class AboutPage {
  protected readonly facade = inject(AboutFacade);
}
