import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '@env';
import { AboutAudiences } from '@/features/public/about/components/about-audiences/about-audiences';
import { AboutFacts } from '@/features/public/about/components/about-facts/about-facts';
import { AboutSteps } from '@/features/public/about/components/about-steps/about-steps';
import { AboutTeam } from '@/features/public/about/components/about-team/about-team';
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
    AboutTeam,
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
    <app-about-team [members]="facade.team()" />
    <app-about-audiences [audiences]="facade.audiences()" />
    <app-about-facts [facts]="facade.facts()" />
    <app-about-steps [steps]="facade.steps()" />
    <app-about-cta />
  `,
})
export class AboutPage {
  protected readonly facade = inject(AboutFacade);
  private readonly seo = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.seo.setLocalizedPage({
      titleKey: 'seo.about.title',
      descriptionKey: 'seo.about.description',
      canonicalPath: '/nosotros',
    });

    // El JSON-LD lleva el puesto traducido: se regenera al cambiar de idioma.
    this.transloco.langChanges$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.setTeamJsonLd());
  }

  /**
   * `Organization` con `employee: Person[]` para que Google asocie a cada
   * persona con Impulso Jobs. Si no hay equipo (producción sin datos reales),
   * se retira el bloque en lugar de publicar uno vacío.
   */
  private setTeamJsonLd(): void {
    const members = this.facade.team();
    if (members.length === 0) {
      this.seo.setJsonLd('team-jsonld', null);
      return;
    }

    this.seo.setJsonLd('team-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Impulso Jobs',
      url: environment.siteUrl,
      employee: members.map((member) => ({
        '@type': 'Person',
        name: member.name,
        jobTitle: this.transloco.translate(member.roleKey),
        ...(member.photo ? { image: this.absolute(member.photo) } : {}),
        ...(member.linkedin ? { sameAs: [member.linkedin] } : {}),
      })),
    });
  }

  private absolute(path: string): string {
    return path.startsWith('http') ? path : `${environment.siteUrl}${path}`;
  }
}
