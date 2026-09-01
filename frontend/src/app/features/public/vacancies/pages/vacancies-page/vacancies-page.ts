import { isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
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
import { SeoService } from '@/core/services/seo.service';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS, professionalAreaBySlug } from '@/shared/catalogs/professional-areas.catalogs';
import { stateBySlug } from '@/shared/utils/seo';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  PublicVacanciesFilters,
  PublicVacanciesPage,
  PublicVacancy,
  PublicVacancySort,
  WORK_MODE_LABELS,
} from '@/features/public/vacancies/models/public-vacancies.models';

const PAGE_SIZE = 10;

/** Primera página renderizada en SSR, transferida para hidratar sin re-pedir. */
const LIST_STATE_KEY = makeStateKey<PublicVacanciesPage>(
  'public-vacancies-list',
);

function options(labels: Record<string, string>, empty: string): IjOption[] {
  return [
    { value: '', label: empty },
    ...Object.keys(labels).map((value) => ({ value, label: labels[value] })),
  ];
}

/** Portal de empleo: buscador de vacantes activas. No requiere sesión. */
@Component({
  selector: 'app-vacancies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AdminPagination, VacancyCard, IjIcon, IjSelect],
  template: `
    <section class="bg-surface px-6 py-12 lg:px-[60px]">
      <div class="mx-auto max-w-[1200px]">
        <h1 class="text-[32px] font-extrabold leading-tight text-ink-900">
          {{ heading() }}
        </h1>
        <p class="mt-2 text-[15px] text-muted">
          {{ total() }} {{ total() === 1 ? 'vacante activa' : 'vacantes activas' }}
          en Impulso Jobs.
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
            <span class="sr-only">Buscar vacante</span>
            <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              <ij-icon name="search" [size]="17" />
            </span>
            <input
              type="search"
              name="q"
              placeholder="Puesto, tecnología, palabra clave…"
              class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
            />
          </label>
          <ij-select
            name="state"
            placeholder="Todo México"
            [options]="stateOptions"
            [ngModel]="stateCode()"
            (ngModelChange)="stateCode.set($event)"
          />
          <ij-select
            name="workMode"
            placeholder="Modalidad"
            [options]="workModeOptions"
            [searchable]="false"
            [ngModel]="workMode()"
            (ngModelChange)="workMode.set($event)"
          />
          <div class="flex items-center gap-2">
            <button
              type="submit"
              class="h-[46px] rounded-xl bg-brand px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
            >
              Buscar
            </button>
            <button
              type="button"
              class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
              (click)="clear()"
            >
              Limpiar
            </button>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <ij-select
              name="employmentType"
              placeholder="Tipo de contratación"
              [options]="employmentOptions"
              [searchable]="false"
              [ngModel]="employmentType()"
              (ngModelChange)="employmentType.set($event)"
            />
            <ij-select
              name="experienceLevel"
              placeholder="Experiencia"
              [options]="experienceOptions"
              [searchable]="false"
              [ngModel]="experienceLevel()"
              (ngModelChange)="experienceLevel.set($event)"
            />
            <ij-select
              name="areaId"
              placeholder="Área profesional"
              [options]="areaOptions"
              [ngModel]="areaId()"
              (ngModelChange)="areaId.set($event)"
            />
            <ij-select
              name="salaryMin"
              placeholder="Salario mínimo"
              [options]="salaryOptions"
              [searchable]="false"
              [ngModel]="salaryMin()"
              (ngModelChange)="salaryMin.set($event)"
            />
            <ij-select
              name="publishedWithinDays"
              placeholder="Fecha de publicación"
              [options]="dateOptions"
              [searchable]="false"
              [ngModel]="publishedWithinDays()"
              (ngModelChange)="publishedWithinDays.set($event)"
            />
            <ij-select
              name="sort"
              label=""
              [options]="sortOptions"
              [searchable]="false"
              [ngModel]="sort()"
              (ngModelChange)="changeSort($event)"
            />
          </div>
        </form>

        @switch (state()) {
          @case ('loading') {
            <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
              Buscando vacantes…
            </div>
          }
          @case ('error') {
            <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
              No se pudieron cargar las vacantes.
            </div>
          }
          @default {
            <div class="flex flex-col gap-4">
              @for (vacancy of vacancies(); track vacancy.id) {
                <app-vacancy-card [vacancy]="vacancy" />
              } @empty {
                <div class="rounded-2xl bg-white p-12 text-center shadow-card">
                  <p class="text-[15px] font-semibold text-ink-900">
                    No encontramos vacantes con esos criterios.
                  </p>
                  <p class="mt-1.5 text-[13.5px] text-muted">
                    Prueba con menos filtros o revisa más adelante.
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

  protected readonly vacancies = signal<PublicVacancy[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);
  protected readonly heading = signal('Encuentra tu próximo empleo');

  protected readonly query = signal('');
  protected readonly stateCode = signal('');
  protected readonly workMode = signal('');
  protected readonly employmentType = signal('');
  protected readonly experienceLevel = signal('');
  protected readonly areaId = signal('');
  protected readonly salaryMin = signal('');
  protected readonly publishedWithinDays = signal('');
  protected readonly sort = signal<PublicVacancySort>('relevance');

  protected readonly stateOptions: IjOption[] = [
    { value: '', label: 'Todo México' },
    ...MX_STATES.map((s) => ({ value: s.code, label: s.name })),
  ];
  protected readonly workModeOptions = options(WORK_MODE_LABELS, 'Modalidad');
  protected readonly employmentOptions = options(
    EMPLOYMENT_TYPE_LABELS,
    'Cualquier contratación',
  );
  protected readonly experienceOptions = options(
    EXPERIENCE_LEVEL_LABELS,
    'Cualquier experiencia',
  );
  protected readonly areaOptions: IjOption[] = [
    { value: '', label: 'Todas las áreas' },
    ...PROFESSIONAL_AREAS.map((a) => ({
      value: String(a.id),
      label: a.name,
    })),
  ];
  protected readonly salaryOptions: IjOption[] = [
    { value: '', label: 'Cualquier salario' },
    ...[5000, 10000, 15000, 20000, 30000, 50000].map((amount) => ({
      value: String(amount),
      label: `Desde ${amount.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      })}`,
    })),
  ];
  protected readonly dateOptions: IjOption[] = [
    { value: '', label: 'Cualquier fecha' },
    { value: '1', label: 'Hoy' },
    { value: '3', label: 'Últimos 3 días' },
    { value: '7', label: 'Última semana' },
    { value: '15', label: 'Últimos 15 días' },
    { value: '30', label: 'Último mes' },
  ];
  protected readonly sortOptions: IjOption[] = [
    { value: 'relevance', label: 'Más relevantes' },
    { value: 'date', label: 'Más recientes' },
    { value: 'salary', label: 'Mejor pagadas' },
  ];

  constructor() {
    // Modo landing (T16): `/trabajo/<area>-en-<estado>` preconfigura filtros.
    const landing = this.route.snapshot.paramMap.get('landing');
    if (landing && !this.applyLanding(landing)) {
      void this.router.navigateByUrl('/vacantes');
      return;
    }
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

  /** Devuelve false si el slug de la landing no existe (área o estado). */
  private applyLanding(landing: string): boolean {
    const match = /^(.+)-en-(.+)$/.exec(landing);
    if (!match) return false;
    const area = professionalAreaBySlug(match[1]);
    const state = stateBySlug(match[2]);
    if (!area || !state) return false;

    this.areaId.set(String(area.id));
    this.stateCode.set(state.code);
    this.heading.set(`Trabajo de ${area.name} en ${state.name}`);
    return true;
  }

  private applySeo(landing: string | null): void {
    if (landing) {
      this.seo.setPage({
        title: `${this.heading()} | Impulso Jobs`,
        description: `Vacantes de ${this.heading().toLowerCase()}. Postúlate gratis en Impulso Jobs, el portal de empleo para México.`,
        canonicalPath: `/trabajo/${landing}`,
      });
      return;
    }
    this.seo.setPage({
      title: 'Vacantes de empleo en México | Impulso Jobs',
      description:
        'Encuentra tu próximo empleo: busca vacantes por área, estado, salario y modalidad, y postúlate gratis en Impulso Jobs.',
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
