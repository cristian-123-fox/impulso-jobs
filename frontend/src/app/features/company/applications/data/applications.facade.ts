import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { ApplicationsApi } from '@/features/company/applications/data/applications.api';
import {
  ApplicationAnswer,
  ApplicationResumeDownload,
  ApplicationStatus,
  ApplicationStats,
  ApplicationStatusHistory,
  CompanyApplication,
} from '@/features/company/applications/models/applications.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 10;

/** Fachada de postulaciones: filtros por vacante y estado + paginación. */
@Injectable()
export class ApplicationsFacade {
  private readonly api = inject(ApplicationsApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly applications = signal<CompanyApplication[]>([]);
  readonly statuses = signal<ApplicationStatus[]>([]);
  readonly stats = signal<ApplicationStats>({});
  readonly unread = signal(0);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  /** Filtros activos. `''` = sin filtrar. */
  readonly vacancyId = signal('');
  readonly status = signal('');

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    this.api
      .list({
        page,
        limit: PAGE_SIZE,
        vacancyId: this.vacancyId() || undefined,
        status: this.status() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.applications.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.stats.set(result.stats ?? {});
          this.unread.set(result.unread ?? 0);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  /** El catálogo de estados no cambia dentro de la sesión. */
  loadStatuses(): void {
    if (this.statuses().length > 0) return;
    this.api
      .listStatuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((statuses) => this.statuses.set(statuses));
  }

  filterByStatus(code: string): void {
    this.status.set(code);
    this.load(1);
  }

  filterByVacancy(vacancyId: string): void {
    this.vacancyId.set(vacancyId);
    this.load(1);
  }

  clearFilters(): void {
    this.vacancyId.set('');
    this.status.set('');
    this.load(1);
  }

  history(id: string): Observable<ApplicationStatusHistory[]> {
    return this.api.history(id).pipe(tap(() => this.markReadLocal(id)));
  }

  answers(id: string): Observable<ApplicationAnswer[]> {
    return this.api.answers(id).pipe(tap(() => this.markReadLocal(id)));
  }

  downloadResume(id: string): Observable<ApplicationResumeDownload> {
    return this.api.downloadResume(id).pipe(tap(() => this.markReadLocal(id)));
  }

  /**
   * El backend marca la postulación como leída en cualquier interacción; aquí
   * se refleja en la fila sin recargar toda la página.
   */
  private markReadLocal(id: string): void {
    const item = this.applications().find((row) => row.id === id);
    if (!item || item.readAt) return;
    const readAt = new Date().toISOString();
    this.applications.update((list) =>
      list.map((row) => (row.id === id ? { ...row, readAt } : row)),
    );
    this.unread.update((count) => Math.max(0, count - 1));
  }

  /**
   * Cambiar el estado mueve los conteos por pestaña, así que se recarga la
   * página actual además de reemplazar la fila.
   */
  changeStatus(id: string, status: string): Observable<CompanyApplication> {
    return this.api.changeStatus(id, status).pipe(
      tap((updated) => {
        this.applications.update((list) =>
          list.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.load(this.page());
      }),
    );
  }
}
