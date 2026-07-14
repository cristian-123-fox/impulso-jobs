import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { FaqAccordion } from '@/features/public/faq/components/faq-accordion/faq-accordion';
import { FaqFacade } from '@/features/public/faq/data/faq.facade';
import { FaqCategoryId } from '@/features/public/faq/models/faq.models';

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
    FaqAccordion,
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
    <section id="faq" class="px-6 pt-16 lg:px-[60px]">
      <div class="mx-auto max-w-[900px] text-center">
        <p class="text-[15px] font-semibold text-brand">FAQ</p>
        <h2 class="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Preguntas frecuentes en Inicio
        </h2>
        <p class="mt-4 text-sm leading-7 text-muted sm:text-[15px]">
          Resuelve dudas comunes sobre vacantes, postulaciones, pagos y el uso de tu cuenta sin salir de la pagina principal.
        </p>
      </div>
    </section>
    <app-faq-accordion
      [tabs]="faqFacade.tabs()"
      [activeTabId]="activeFaqTab()"
      [items]="visibleFaqItems()"
      [openItemId]="openFaqItemId()"
      (tabSelected)="onFaqTabSelected($event)"
      (itemToggled)="onFaqItemToggled($event)"
    />
    <app-job-listings [jobs]="facade.jobs()" />
    <app-testimonials [testimonials]="facade.testimonials()" />
    <app-latest-articles [articles]="facade.articles()" />
  `,
})
export class HomePage {
  protected readonly facade = inject(HomeFacade);
  protected readonly faqFacade = inject(FaqFacade);
  private readonly router = inject(Router);
  protected readonly activeFaqTab = signal<FaqCategoryId>('general');
  protected readonly openFaqItemId = signal<string | null>(null);

  protected readonly categoryOptions = computed(() =>
    this.facade.categories().map((category) => category.name),
  );

  protected readonly visibleFaqItems = computed(() =>
    this.faqFacade
      .items()
      .filter((item) => item.categoryId === this.activeFaqTab()),
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

  protected onFaqTabSelected(tabId: FaqCategoryId): void {
    this.activeFaqTab.set(tabId);
    this.openFaqItemId.set(null);
  }

  protected onFaqItemToggled(itemId: string): void {
    this.openFaqItemId.update((current) => (current === itemId ? null : itemId));
  }
}
