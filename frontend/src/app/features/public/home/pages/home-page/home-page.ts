import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { HomeFacade } from '@/features/public/home/data/home.facade';
import { JobSearchCriteria } from '@/features/public/home/models/home.models';
import { HeroSearch } from '@/features/public/home/components/hero-search/hero-search';
import { HowItWorks } from '@/features/public/home/components/how-it-works/how-it-works';
import { JobCategories } from '@/features/public/home/components/job-categories/job-categories';
import { FeaturedVacancies } from '@/features/public/home/components/featured-vacancies/featured-vacancies';
import { ResumeCta } from '@/features/public/home/components/resume-cta/resume-cta';
import { TopCompanies } from '@/features/public/home/components/top-companies/top-companies';
import { Testimonials } from '@/features/public/home/components/testimonials/testimonials';
import { FaqAccordion } from '@/features/public/faq/components/faq-accordion/faq-accordion';
import { FaqFacade } from '@/features/public/faq/data/faq.facade';
import { FaqCategoryId } from '@/features/public/faq/models/faq.models';
import { SeoService } from '@/core/services/seo.service';

/**
 * Container (smart) de la home. Obtiene el estado del `HomeFacade` y lo
 * distribuye a los componentes presentacionales; también reacciona a sus outputs.
 *
 * Orden de secciones: buscar, explorar por área, ver vacantes reales, entender
 * el proceso, crear el currículum, la vía para empresas, prueba social y dudas.
 * Antes las vacantes aparecían en séptimo lugar, después del FAQ, en un portal
 * cuyo producto son precisamente las vacantes.
 *
 * `/inicio` se renderiza en servidor por petición (T26), así que la llamada a
 * la API sigue yendo en `afterNextRender`: allí no hay red ni sesión.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSearch,
    JobCategories,
    FeaturedVacancies,
    HowItWorks,
    ResumeCta,
    TopCompanies,
    Testimonials,
    FaqAccordion,
    TranslocoDirective,
  ],
  template: `
    <app-hero-search
      [stats]="facade.heroStats()"
      [popularSearches]="facade.popularSearches()"
      [vacancies]="facade.featured()"
      [vacanciesState]="facade.featuredState()"
      (search)="onSearch($event)"
    />

    <app-job-categories [areas]="facade.areas()" />

    <app-featured-vacancies
      [vacancies]="facade.featured()"
      [state]="facade.featuredState()"
      (retry)="facade.load()"
    />

    <app-how-it-works [steps]="facade.steps()" />

    <app-resume-cta />

    <app-top-companies [companies]="facade.companies()" />

    <app-testimonials [testimonials]="facade.testimonials()" />

    <section *transloco="let t" id="faq" class="px-6 pt-16 lg:px-[60px]">
      <div class="mx-auto max-w-[900px] text-center">
        <h2 class="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {{ t('home.faqTeaser.title') }}
        </h2>
        <p class="mx-auto mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          {{ t('home.faqTeaser.lead') }}
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
  `,
})
export class HomePage {
  protected readonly facade = inject(HomeFacade);
  protected readonly faqFacade = inject(FaqFacade);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly activeFaqTab = signal<FaqCategoryId>('general');
  protected readonly openFaqItemId = signal<string | null>(null);

  protected readonly visibleFaqItems = computed(() =>
    this.faqFacade
      .items()
      .filter((item) => item.categoryId === this.activeFaqTab()),
  );

  constructor() {
    this.seo.setLocalizedPage({
      titleKey: 'seo.home.title',
      descriptionKey: 'seo.home.description',
      canonicalPath: '/inicio',
    });

    afterNextRender(() => this.facade.load());
  }

  /**
   * Lleva la búsqueda del hero a `/vacantes` con los nombres de parámetro que
   * esa página lee (`q`, `area`, `estado`). Antes enviaba `categoria` y
   * `ubicacion`, que nadie leía: lo que el usuario escribía se perdía.
   */
  protected onSearch(criteria: JobSearchCriteria): void {
    void this.router.navigate(['/vacantes'], {
      queryParams: {
        q: criteria.query || null,
        area: criteria.area || null,
        estado: criteria.state || null,
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
