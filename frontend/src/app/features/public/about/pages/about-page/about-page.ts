import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AboutAudiences } from '@/features/public/about/components/about-audiences/about-audiences';
import { AboutFacts } from '@/features/public/about/components/about-facts/about-facts';
import { AboutSteps } from '@/features/public/about/components/about-steps/about-steps';
import { AboutCta } from '@/features/public/about/components/about-cta/about-cta';
import { AboutFacade } from '@/features/public/about/data/about.facade';
import { IjPageHeader } from '@/shared/ui';
import { SeoService } from '@/core/services/seo.service';

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjPageHeader, AboutAudiences, AboutFacts, AboutSteps, AboutCta],
  template: `
    <ij-page-header
      [title]="facade.hero().title"
      [lead]="facade.hero().lead"
      [breadcrumb]="facade.hero().breadcrumbLabel"
    />
    <app-about-audiences [audiences]="facade.audiences()" />
    <app-about-facts [facts]="facade.facts()" />
    <app-about-steps [steps]="facade.steps()" />
    <app-about-cta [content]="facade.cta()" />
  `,
})
export class AboutPage {
  protected readonly facade = inject(AboutFacade);

  constructor() {
    inject(SeoService).setPage({
      title: 'Nosotros | Impulso Jobs',
      description:
        'Qué es Impulso Jobs: una bolsa de trabajo para México, con filtros por área, estado y modalidad. Gratis para candidatos.',
      canonicalPath: '/nosotros',
    });
  }
}
