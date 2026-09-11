import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
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
  imports: [
    IjPageHeader,
    AboutAudiences,
    AboutFacts,
    AboutSteps,
    AboutCta,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <ij-page-header
        [title]="t('about.hero.title')"
        [lead]="t('about.hero.lead')"
        [breadcrumb]="t('about.hero.breadcrumb')"
      />
    </ng-container>
    <app-about-audiences [audiences]="facade.audiences()" />
    <app-about-facts [facts]="facade.facts()" />
    <app-about-steps [steps]="facade.steps()" />
    <app-about-cta />
  `,
})
export class AboutPage {
  protected readonly facade = inject(AboutFacade);

  constructor() {
    inject(SeoService).setLocalizedPage({
      titleKey: 'seo.about.title',
      descriptionKey: 'seo.about.description',
      canonicalPath: '/nosotros',
    });
  }
}
