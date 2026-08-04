import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  PublicVacanciesFilters,
  PublicVacancy,
  WORK_MODE_LABELS,
} from '@/features/public/vacancies/models/public-vacancies.models';

const PAGE_SIZE = 10;

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
          Encuentra tu próximo empleo
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

  protected readonly vacancies = signal<PublicVacancy[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);

  protected readonly query = signal('');
  protected readonly stateCode = signal('');
  protected readonly workMode = signal('');
  protected readonly employmentType = signal('');
  protected readonly experienceLevel = signal('');

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

  constructor() {
    // La ruta se prerenderiza: la llamada va tras el primer render en cliente.
    afterNextRender(() => this.load(1));
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

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.vacancies.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }
}
