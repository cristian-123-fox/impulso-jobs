import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AdminLegalApi } from '@/features/admin/legal/data/admin-legal.api';
import {
  AdminConsentsPage,
  AdminConsentsQuery,
  AdminLegalConsent,
  ConsentSummary,
} from '@/features/admin/legal/models/legal-consents.models';

/** Estado de la pantalla cuando no hay nada que mostrar. */
const EMPTY_PAGE: AdminConsentsPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  pages: 1,
  summary: {
    total: 0,
    granted: 0,
    denied: 0,
    activeTerms: 0,
    activePrivacy: 0,
    activeImageRights: 0,
  },
};

/**
 * Estado de la pantalla con Signals.
 *
 * El buscador escribe en `searchTerm` y **no** dispara peticiones: el `effect`
 * de abajo espera a que se deje de teclear. Sin ese retardo, cada tecla sería un
 * `GET` con su propio `HttpParams` y la tabla parpadearía mientras se escribe.
 *
 * `page` vuelve a 1 en cuanto cambia cualquier filtro: quedarse en la página 7
 * de un filtro nuevo y encontrar un listado vacío confunde más que ayuda.
 */
@Injectable({ providedIn: 'root' })
export class AdminLegalFacade {
  private readonly api = inject(AdminLegalApi);

  private readonly _items = signal<AdminLegalConsent[]>([]);
  private readonly _summary = signal<ConsentSummary>(EMPTY_PAGE.summary);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly pages = signal(1);

  /** Texto del buscador. No dispara peticiones por sí solo. */
  readonly searchTerm = signal('');
  readonly documentCode = signal<string | undefined>(undefined);
  readonly granted = signal<boolean | undefined>(undefined);

  private query: AdminConsentsQuery = { page: 1, limit: 20 };

  /** Aplica los filtros pendientes y vuelve a la primera página. */
  search(): void {
    this.page.set(1);
    this.load();
  }

  setPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.documentCode.set(undefined);
    this.granted.set(undefined);
    this.page.set(1);
    this.load();
  }

  load(): void {
    const search = this.searchTerm().trim();
    const documentCode = this.documentCode();
    const granted = this.granted();

    this.query = {
      page: this.page(),
      limit: this.limit(),
      ...(search ? { search } : {}),
      ...(documentCode ? { documentCode: documentCode as never } : {}),
      ...(granted !== undefined ? { granted } : {}),
    };

    this._loading.set(true);
    this._error.set(null);

    this.api
      .list(this.query)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (!page) {
          // Un fallo no puede dejar la pantalla mostrando datos viejos como si
          // fueran actuales: se vacía y se dice que no se pudo leer.
          this._items.set([]);
          this._summary.set(EMPTY_PAGE.summary);
          this._error.set('No se pudo leer el registro de consentimientos.');
        } else {
          this._items.set(page.items);
          this._summary.set(page.summary);
          this.total.set(page.total);
          this.pages.set(page.pages);
        }
        this._loading.set(false);
      });
  }
}