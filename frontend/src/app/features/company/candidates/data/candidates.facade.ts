import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { CandidatesApi } from '@/features/company/candidates/data/candidates.api';
import {
  CandidateDetail,
  CandidateSearchItem,
  TalentQuota,
} from '@/features/company/candidates/models/candidates.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 12;

/** Fachada del banco de talento: búsqueda, cupo y ficha del candidato. */
@Injectable()
export class CandidatesFacade {
  private readonly api = inject(CandidatesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly candidates = signal<CandidateSearchItem[]>([]);
  readonly quota = signal<TalentQuota | null>(null);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  readonly search = signal('');
  readonly stateCode = signal('');
  readonly skill = signal('');
  readonly onlyAvailable = signal(false);

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    this.api
      .search({
        page,
        limit: PAGE_SIZE,
        search: this.search().trim() || undefined,
        state: this.stateCode() || undefined,
        skill: this.skill().trim() || undefined,
        immediatelyAvailable: this.onlyAvailable() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.candidates.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.quota.set(result.quota);
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
    this.skill.set('');
    this.onlyAvailable.set(false);
    this.load(1);
  }

  /**
   * Abre la ficha. El backend devuelve el cupo ya actualizado, así que se
   * refresca el contador y se marca al candidato como desbloqueado.
   */
  open(id: string): Observable<CandidateDetail> {
    return this.api.get(id).pipe(
      tap((detail) => {
        this.quota.set(detail.quota);
        this.candidates.update((list) =>
          list.map((item) =>
            item.id === id ? { ...item, alreadyUnlocked: true } : item,
          ),
        );
      }),
    );
  }
}
