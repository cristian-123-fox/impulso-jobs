import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { CompaniesApi } from '@/features/admin/companies/data/companies.api';
import {
  AdminCompany,
  CompaniesFilters,
  CreateCompanyPayload,
  CreateCompanyResult,
} from '@/features/admin/companies/models/companies.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 10;

/** Fachada del feature admin/empresas: filtros + paginación con Signals. */
@Injectable()
export class CompaniesFacade {
  private readonly api = inject(CompaniesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly companies = signal<AdminCompany[]>([]);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  readonly search = signal('');
  readonly stateCode = signal('');

  readonly hasFilters = computed(
    () => Boolean(this.search()) || Boolean(this.stateCode()),
  );

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    const filters: CompaniesFilters = { page, limit: PAGE_SIZE };
    if (this.search().trim()) filters.search = this.search().trim();
    if (this.stateCode()) filters.state = this.stateCode();

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

  clearFilters(): void {
    this.search.set('');
    this.stateCode.set('');
    this.load(1);
  }

  create(payload: CreateCompanyPayload): Observable<CreateCompanyResult> {
    return this.api.create(payload);
  }
}
