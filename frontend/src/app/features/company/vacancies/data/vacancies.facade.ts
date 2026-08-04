import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import {
  SaveVacancyPayload,
  VacanciesFilters,
  Vacancy,
  VacancyStats,
  VacancyStatus,
} from '@/features/company/vacancies/models/vacancies.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 10;

const EMPTY_STATS: VacancyStats = { total: 0, active: 0, paused: 0, closed: 0 };

/** Fachada del feature empresa/vacantes: filtros y paginación con Signals. */
@Injectable()
export class VacanciesFacade {
  private readonly api = inject(VacanciesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly vacancies = signal<Vacancy[]>([]);
  readonly stats = signal<VacancyStats>(EMPTY_STATS);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  readonly search = signal('');
  readonly status = signal<VacancyStatus | ''>('');

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    const filters: VacanciesFilters = { page, limit: PAGE_SIZE };
    if (this.search().trim()) filters.search = this.search().trim();
    if (this.status()) filters.status = this.status() as VacancyStatus;

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.vacancies.set(result.items);
          this.stats.set(result.stats);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  applyFilters(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.load(1);
  }

  /** Filtra por estado desde las tarjetas de totales. */
  filterByStatus(status: VacancyStatus | ''): void {
    this.status.set(status);
    this.load(1);
  }

  create(payload: SaveVacancyPayload): Observable<Vacancy> {
    return this.api.create(payload);
  }

  update(id: string, payload: SaveVacancyPayload): Observable<Vacancy> {
    return this.api.update(id, payload);
  }

  pause(id: string): Observable<Vacancy> {
    return this.api.pause(id);
  }

  reactivate(id: string, title?: string): Observable<Vacancy> {
    return this.api.reactivate(id, title);
  }

  refresh(id: string): Observable<Vacancy> {
    return this.api.refresh(id);
  }

  close(id: string): Observable<Vacancy> {
    return this.api.close(id);
  }

  /** Sustituye una fila tras una acción, sin recargar la página completa. */
  replace(vacancy: Vacancy): void {
    this.vacancies.update((list) =>
      list.map((item) => (item.id === vacancy.id ? vacancy : item)),
    );
  }
}
