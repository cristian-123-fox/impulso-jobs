import { isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  makeStateKey,
  PLATFORM_ID,
  signal,
  TransferState,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { SeoService } from '@/core/services/seo.service';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS, professionalAreaBySlug } from '@/shared/catalogs/professional-areas.catalogs';
import { stateBySlug } from '@/shared/utils/seo';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import {
  EmploymentType,
  ExperienceLevel,
  PublicVacanciesFilters,
  PublicVacanciesPage,
  PublicVacancy,
  PublicVacancySort,
  WorkMode,
} from '@/features/public/vacancies/models/public-vacancies.models';

const PAGE_SIZE = 10;

/** Primera página renderizada en SSR, transferida para hidratar sin re-pedir. */
const LIST_STATE_KEY = makeStateKey<PublicVacanciesPage>(
  'public-vacancies-list',
);

/** Escalones del filtro de salario mínimo, en MXN mensuales. */
const SALARY_STEPS = [5000, 10000, 15000, 20000, 30000, 50000];

/** Portal de empleo: buscador de vacantes activas. No requiere sesión. */
@Component({
  selector: 'app-vacancies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AdminPagination,
    VacancyCard,
    IjIcon,
    IjSelect,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <section class="bg-surface px-6 py-12 lg:px-[60px]">
        <div class="mx-auto max-w-[1200px]">
          <h1 class="text-[32px] font-extrabold leading-tight text-ink-900">
            {{ heading() }}
          </h1>
          <p class="mt-2 text-[15px] text-muted">
            {{
              total() === 1
                ? t('jobs.countOne', { count: total() })
                : t('jobs.countMany', { count: total() })
            }}
          </p>
        </div>
      </section>

      <section class="px-6 py-10 lg:px-[60px]">
        <div class="mx-auto max-w-[1200px]">
          <form
            class="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow-card lg:grid-cols-[1fr_190px_190px_auto]"
            (ngSubmit)="search()"
          >
            <label class="relative block">
              <span class="sr-only">{{ t('jobs.searchLabel') }}</span>
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <ij-icon name="search" [size]="17" />
              </span>
              <input
                type="search"
                name="q"
                [placeholder]="t('jobs.searchPlaceholder')"
                class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
              />
            </label>
            <ij-select
              name="state"
              [placeholder]="t('jobs.anyState')"
              [options]="stateOptions()"
              [ngModel]="stateCode()"
              (ngModelChange)="stateCode.set($event)"
            />
            <ij-select
              name="workMode"
              [placeholder]="t('jobs.anyWorkMode')"
              [options]="workModeOptions()"
              [searchable]="false"
              [ngModel]="workMode()"
              (ngModelChange)="workMode.set($event)"
            />
            <div class="flex items-center gap-2">
              <button
                type="submit"
                class="h-[46px] rounded-xl bg-brand-700 px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
              >
                {{ t('jobs.submit') }}
              </button>
              <button
                type="button"
                class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                (click)="clear()"
              >
                {{ t('jobs.clear') }}
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
              <ij-select
                name="employmentType"
                [placeholder]="t('jobs.anyEmployment')"
                [options]="employmentOptions()"
                [searchable]="false"
                [ngModel]="employmentType()"
                (ngModelChange)="employmentType.set($event)"
              />
              <ij-select
                name="experienceLevel"
                [placeholder]="t('jobs.anyExperience')"
                [options]="experienceOptions()"
                [searchable]="false"
                [ngModel]="experienceLevel()"
                (ngModelChange)="experienceLevel.set($event)"
              />
              <ij-select
                name="areaId"
                [placeholder]="t('jobs.anyArea')"
                [options]="areaOptions()"
                [ngModel]="areaId()"
                (ngModelChange)="areaId.set($event)"
              />
              <ij-select
                name="salaryMin"
                [placeholder]="t('jobs.anySalary')"
                [options]="salaryOptions()"
                [searchable]="false"
                [ngModel]="salaryMin()"
                (ngModelChange)="salaryMin.set($event)"
              />
              <ij-select
                name="publishedWithinDays"
                [placeholder]="t('jobs.anyDate')"
                [options]="dateOptions()"
                [searchable]="false"
                [ngModel]="publishedWithinDays()"
                (ngModelChange)="publishedWithinDays.set($event)"
              />
              <ij-select
                name="sort"
                label=""
                [options]="sortOptions()"
                [searchable]="false"
                [ngModel]="sort()"
                (ngModelChange)="changeSort($event)"
              />
            </div>
          </form>

          @switch (state()) {
            @case ('loading') {
              <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
                {{ t('jobs.loading') }}
              </div>
            }
            @case ('error') {
              <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
                {{ t('jobs.error') }}
              </div>
            }
            @default {
              <div class="flex flex-col gap-4">
                @for (vacancy of vacancies(); track vacancy.id) {
                  <app-vacancy-card [vacancy]="vacancy" />
                } @empty {
                  <div class="rounded-2xl bg-white p-12 text-center shadow-card">
                    <p class="text-[15px] font-semibold text-ink-900">
                      {{ t('jobs.emptyTitle') }}
                    </p>
                    <p class="mt-1.5 text-[13.5px] text-muted">
                      {{ t('jobs.emptyBody') }}
                    </p>
                  </div>
                }
              </div>
              <app-admin-pagination
                [page]="page()"
                [pages]="pages()"
                [total]="total()"
                (pageChange)="load($event)"
              />
            }
          }
        </div>
      </section>
    </ng-container>
  `,
})
export class VacanciesPage {
  private readonly api = inject(PublicVacanciesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(AppTranslateService);
  private readonly format = inject(LocaleFormatService);

  protected readonly vacancies = signal<PublicVacancy[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);

  /**
   * Encabezado: el genérico o el de la landing (T16). Se guarda el área y el
   * estado, no el texto ya compuesto, porque la frase cambia de forma al
   * traducirse ("Trabajo de X en Y" / "X jobs in Y").
   */
  private readonly landingPlace = signal<{ area: string; state: string } | null>(
    null,
  );

  protected readonly heading = computed(() => {
    const place = this.landingPlace();
    return place
      ? this.i18n.t('jobs.landingHeading', place)
      : this.i18n.t('jobs.heading');
  });

  protected readonly query = signal('');
  protected readonly stateCode = signal('');
  protected readonly workMode = signal('');
  protected readonly employmentType = signal('');
  protected readonly experienceLevel = signal('');
  protected readonly areaId = signal('');
  protected readonly salaryMin = signal('');
  protected readonly publishedWithinDays = signal('');
  protected readonly sort = signal<PublicVacancySort>('relevance');

  /**
   * Las opciones son `computed` porque su texto se traduce (T26): con arrays
   * fijos, cambiar de idioma dejaba los desplegables en el idioma anterior
   * hasta recargar. Los nombres de estados y áreas salen del catálogo y no se
   * traducen.
   */
  protected readonly stateOptions = computed<IjOption[]>(() => [
    { value: '', label: this.i18n.t('jobs.anyState') },
    ...MX_STATES.map((s) => ({ value: s.code, label: s.name })),
  ]);

  protected readonly workModeOptions = computed<IjOption[]>(() =>
    this.enumOptions('workMode', Object.values(WorkMode), 'jobs.anyWorkMode'),
  );

  protected readonly employmentOptions = computed<IjOption[]>(() =>
    this.enumOptions(
      'employmentType',
      Object.values(EmploymentType),
      'jobs.anyEmployment',
    ),
  );

  protected readonly experienceOptions = computed<IjOption[]>(() =>
    this.enumOptions(
      'experienceLevel',
      Object.values(ExperienceLevel),
      'jobs.anyExperience',
    ),
  );

  protected readonly areaOptions = computed<IjOption[]>(() => [
    { value: '', label: this.i18n.t('jobs.anyArea') },
    ...PROFESSIONAL_AREAS.map((a) => ({
      value: String(a.id),
      label: a.name,
    })),
  ]);

  protected readonly salaryOptions = computed<IjOption[]>(() => [
    { value: '', label: this.i18n.t('jobs.anySalary') },
    ...SALARY_STEPS.map((amount) => ({
      value: String(amount),
      label: this.i18n.t('jobs.salaryFrom', {
        amount: this.format.currency(amount),
      }),
    })),
  ]);

  protected readonly dateOptions = computed<IjOption[]>(() => [
    { value: '', label: this.i18n.t('jobs.anyDate') },
    { value: '1', label: this.i18n.t('jobs.dates.today') },
    { value: '3', label: this.i18n.t('jobs.dates.d3') },
    { value: '7', label: this.i18n.t('jobs.dates.d7') },
    { value: '15', label: this.i18n.t('jobs.dates.d15') },
    { value: '30', label: this.i18n.t('jobs.dates.d30') },
  ]);

  protected readonly sortOptions = computed<IjOption[]>(() => [
    { value: 'relevance', label: this.i18n.t('jobs.sort.relevance') },
    { value: 'date', label: this.i18n.t('jobs.sort.date') },
    { value: 'salary', label: this.i18n.t('jobs.sort.salary') },
  ]);

  private enumOptions(
    group: string,
    values: readonly string[],
    emptyKey: string,
  ): IjOption[] {
    return [
      { value: '', label: this.i18n.t(emptyKey) },
      ...values.map((value) => ({
        value,
        label: this.i18n.enumLabel(group, value),
      })),
    ];
  }

  constructor() {
    // Modo landing (T16): `/trabajo/<area>-en-<estado>` preconfigura filtros.
    const landing = this.route.snapshot.paramMap.get('landing');
    if (landing && !this.applyLanding(landing)) {
      void this.router.navigateByUrl('/vacantes');
      return;
    }
    if (!landing) this.applyQueryParams();
    this.applySeo(landing);

    // T16: la ruta se sirve con SSR. En el servidor se carga la primera página
    // y se transfiere; el cliente hidrata con esos datos sin repetir el fetch.
    const cached = this.transferState.get(LIST_STATE_KEY, null);
    if (cached) {
      this.transferState.remove(LIST_STATE_KEY);
      this.applyResult(cached);
    } else if (isPlatformServer(this.platformId)) {
      this.load(1);
    } else {
      afterNextRender(() => this.load(1));
    }
  }

  /**
   * Filtros que llegan por query string, p. ej. desde el buscador de la home:
   * `/vacantes?q=ventas&area=23&estado=JAL`.
   *
   * Esta página no leía ningún query param, sólo el `:landing` de la ruta SEO.
   * El buscador del hero navegaba aquí con lo que el usuario había escrito y se
   * descartaba en silencio: siempre se veía el listado sin filtrar.
   *
   * Se validan contra los catálogos: un `area` o `estado` inventado en la URL
   * se ignora en vez de mandarse a la API.
   */
  private applyQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;

    const query = params.get('q')?.trim();
    if (query) this.query.set(query);

    const areaId = Number(params.get('area'));
    if (PROFESSIONAL_AREAS.some((area) => area.id === areaId)) {
      this.areaId.set(String(areaId));
    }

    const stateCode = params.get('estado');
    if (stateCode && MX_STATES.some((state) => state.code === stateCode)) {
      this.stateCode.set(stateCode);
    }
  }

  /** Devuelve false si el slug de la landing no existe (área o estado). */
  private applyLanding(landing: string): boolean {
    const match = /^(.+)-en-(.+)$/.exec(landing);
    if (!match) return false;
    const area = professionalAreaBySlug(match[1]);
    const state = stateBySlug(match[2]);
    if (!area || !state) return false;

    this.areaId.set(String(area.id));
    this.stateCode.set(state.code);
    this.landingPlace.set({ area: area.name, state: state.name });
    return true;
  }

  private applySeo(landing: string | null): void {
    const place = this.landingPlace();
    if (landing && place) {
      // La landing tiene datos propios (área y estado), así que se traduce
      // aquí en vez de con `setLocalizedPage`, que sólo toma claves sueltas.
      this.seo.setPage({
        title: this.i18n.t('seo.landing.title', {
          heading: this.heading(),
        }),
        description: this.i18n.t('seo.landing.description', place),
        canonicalPath: `/trabajo/${landing}`,
      });
      return;
    }
    this.seo.setLocalizedPage({
      titleKey: 'seo.vacancies.title',
      descriptionKey: 'seo.vacancies.description',
      canonicalPath: '/vacantes',
    });
  }

  private applyResult(result: PublicVacanciesPage): void {
    this.vacancies.set(result.items);
    this.total.set(result.total);
    this.pages.set(result.pages);
    this.state.set('loaded');
  }

  protected search(): void {
    this.load(1);
  }

  protected clear(): void {
    this.query.set('');
    this.stateCode.set('');
    this.workMode.set('');
    this.employmentType.set('');
    this.experienceLevel.set('');
    this.areaId.set('');
    this.salaryMin.set('');
    this.publishedWithinDays.set('');
    this.sort.set('relevance');
    this.load(1);
  }

  /** Cambiar el orden reordena de inmediato, sin esperar a "Buscar". */
  protected changeSort(value: string): void {
    this.sort.set(value as PublicVacancySort);
    this.load(1);
  }

  protected load(page: number): void {
    this.state.set('loading');
    this.page.set(page);

    const filters: PublicVacanciesFilters = { page, limit: PAGE_SIZE };
    if (this.query().trim()) filters.search = this.query().trim();
    if (this.stateCode()) filters.state = this.stateCode();
    if (this.workMode()) filters.workMode = this.workMode();
    if (this.employmentType()) filters.employmentType = this.employmentType();
    if (this.experienceLevel()) {
      filters.experienceLevel = this.experienceLevel();
    }
    if (this.areaId()) filters.areaId = Number(this.areaId());
    if (this.salaryMin()) filters.salaryMin = Number(this.salaryMin());
    if (this.publishedWithinDays()) {
      filters.publishedWithinDays = Number(this.publishedWithinDays());
    }
    if (this.sort() !== 'relevance') filters.sort = this.sort();

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.applyResult(result);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(LIST_STATE_KEY, result);
          }
        },
        error: () => this.state.set('error'),
      });
  }
}
