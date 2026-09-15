import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { IjSortState } from '@/shared/ui';
import { CompaniesApi } from '@/features/admin/companies/data/companies.api';
import {
  AdminCompany,
  CompaniesFilters,
  CreateCompanyPayload,
  CreateCompanyResult,
  UpdateCompanyPayload,
} from '@/features/admin/companies/models/companies.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const DEFAULT_PAGE_SIZE = 10;

/** Fachada del feature admin/empresas: filtros + paginación con Signals. */
@Injectable()
export class CompaniesFacade {
  private readonly api = inject(CompaniesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly companies = signal<AdminCompany[]>([]);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  /** Filas por página; la elige el usuario desde la paginación. */
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly pages = signal(1);

  readonly search = signal('');
  readonly stateCode = signal('');
  /** Orden de servidor. `null` deja el del backend (alta descendente). */
  readonly sort = signal<IjSortState | null>(null);

  readonly hasFilters = computed(
    () => Boolean(this.search()) || Boolean(this.stateCode()),
  );

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    const filters: CompaniesFilters = { page, limit: this.pageSize() };
    if (this.search().trim()) filters.search = this.search().trim();
    if (this.stateCode()) filters.state = this.stateCode();
    const sort = this.sort();
    if (sort) {
      filters.sortBy = sort.column;
      filters.sortOrder = sort.order;
    }

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.companies.set(result.items);
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

  /** Cambia el orden y vuelve a la página 1 (ver `UsersFacade.applySort`). */
  applySort(sort: IjSortState | null): void {
    this.sort.set(sort);
    this.load(1);
  }

  /** Cambia el tamaño de página y vuelve a la primera. */
  applyPageSize(size: number): void {
    this.pageSize.set(size);
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.stateCode.set('');
    this.load(1);
  }

  create(payload: CreateCompanyPayload): Observable<CreateCompanyResult> {
    return this.api.create(payload);
  }

  update(id: string, payload: UpdateCompanyPayload): Observable<AdminCompany> {
    return this.api.update(id, payload).pipe(
      tap((updated) =>
        this.companies.update((list) =>
          list.map((company) => (company.id === updated.id ? updated : company)),
        ),
      ),
    );
  }
}
