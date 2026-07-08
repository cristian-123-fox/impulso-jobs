import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HomeFacade } from '@/features/public/home/data/home.facade';
import { JobSearchCriteria } from '@/features/public/home/models/home.models';
import { HeroSearch } from '@/features/public/home/components/hero-search/hero-search';
import { HowItWorks } from '@/features/public/home/components/how-it-works/how-it-works';
import { JobCategories } from '@/features/public/home/components/job-categories/job-categories';
import { ResumeCta } from '@/features/public/home/components/resume-cta/resume-cta';
import { TopCompanies } from '@/features/public/home/components/top-companies/top-companies';
import { JobListings } from '@/features/public/home/components/job-listings/job-listings';
import { Testimonials } from '@/features/public/home/components/testimonials/testimonials';
import { LatestArticles } from '@/features/public/home/components/latest-articles/latest-articles';

/**
 * Container (smart) de la home. Obtiene el estado del `HomeFacade` y lo
 * distribuye a los componentes presentacionales; también reacciona a sus outputs.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSearch,
    HowItWorks,
    JobCategories,
    ResumeCta,
    TopCompanies,
    JobListings,
    Testimonials,
    LatestArticles,
  ],
  template: `
    <app-hero-search
      [stats]="facade.heroStats()"
      [popularSearches]="facade.popularSearches()"
      [categoryOptions]="categoryOptions()"
      (search)="onSearch($event)"
    />
    <app-how-it-works [steps]="facade.steps()" />
    <app-job-categories [categories]="facade.categories()" />
    <app-resume-cta />
    <app-top-companies
      [companies]="facade.companies()"
      [stats]="facade.platformStats()"
    />
    <app-job-listings [jobs]="facade.jobs()" />
    <app-testimonials [testimonials]="facade.testimonials()" />
    <app-latest-articles [articles]="facade.articles()" />
  `,
})
export class HomePage {
  protected readonly facade = inject(HomeFacade);
  private readonly router = inject(Router);

  protected readonly categoryOptions = computed(() =>
    this.facade.categories().map((category) => category.name),
  );

  protected onSearch(criteria: JobSearchCriteria): void {
    void this.router.navigate(['/vacantes'], {
      queryParams: {
        q: criteria.query || null,
        categoria: criteria.category || null,
        ubicacion: criteria.location || null,
      },
    });
  }
}
