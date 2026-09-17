import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IjButton, IjIcon, IjSpinner } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { CandidateSavedVacanciesApi } from '@/features/candidate/data/candidate-saved-vacancies.api';
import { SavedVacancyItem } from '@/features/candidate/models/candidate-saved-vacancies.models';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import { VacancyDetailModal } from '@/features/candidate/components/vacancy-detail-modal/vacancy-detail-modal';

const PAGE_SIZE = 10;

/** T17 (fase 1): vacantes guardadas del candidato. */
@Component({
  selector: 'app-candidate-saved-vacancies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AdminPagination, VacancyCard, IjButton, IjIcon, IjSpinner, VacancyDetailModal],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
        Vacantes guardadas
      </h1>
      <p class="mt-1.5 text-[14px] font-medium text-muted">
        Las vacantes que marcaste para revisar más tarde.
      </p>

      <div class="mt-6">
        @if (loading()) {
          <div class="flex flex-col items-center gap-3 py-10">
            <ij-spinner />
            <span class="text-[13px] font-medium text-muted">Cargando vacantes guardadas…</span>
          </div>
        } @else if (error()) {
          <div
            class="rounded-2xl bg-red-50 p-6 text-center text-[13.5px] font-medium text-red-700"
          >
            {{ error() }}
          </div>
        } @else if (items().length === 0) {
          <div class="rounded-2xl border border-line bg-white p-12 text-center shadow-card">
            <span
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"
            >
              <ij-icon name="bookmark" [size]="22" />
            </span>
            <p class="mt-4 text-[15px] font-semibold text-ink-900">
              Aún no guardas ninguna vacante
            </p>
            <p class="mt-1.5 text-[14px] font-medium text-muted">
              Guarda las vacantes que te interesen desde su detalle y vuelve a
              ellas cuando quieras.
            </p>
            <a ij-button routerLink="/vacantes" class="mt-5 inline-flex">
              Buscar empleo
            </a>
          </div>
        } @else {
          <div class="flex flex-col gap-4">
            @for (item of items(); track item.id) {
              <article>
                <div class="mb-1.5 flex items-center justify-between gap-3">
                  <p class="text-[12px] text-muted">
                    Guardada el {{ savedDate(item) }}
                    @if (!item.isActive) {
                      <span
                        class="ml-2 rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted"
                      >
                        Ya no disponible
                      </span>
                    }
                  </p>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-bold text-body transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    [disabled]="removing() === vacancyIdOf(item)"
                    (click)="remove(item)"
                  >
                    <ij-icon name="x" [size]="13" />
                    Quitar
                  </button>
                </div>
                @if (item.vacancy; as vacancy) {
                  <div
                    role="button"
                    tabindex="0"
                    class="cursor-pointer"
                    (click)="openDetail(vacancy.id)"
                    (keydown.enter)="openDetail(vacancy.id)"
                  >
                    <app-vacancy-card [vacancy]="vacancy" [disableLink]="true" />
                  </div>
                } @else {
                  <div
                    class="rounded-2xl border border-line bg-white p-6 text-[13.5px] text-muted shadow-card"
                  >
                    Esta vacante ya no existe en el portal.
                  </div>
                }
              </article>
            }
          </div>
          @if (pages() > 1) {
            <app-admin-pagination
              [page]="page()"
              [pages]="pages()"
              [total]="total()"
              (pageChange)="load($event)"
            />
          }
        }
      </div>

      @if (selectedVacancyId(); as vacancyId) {
        <app-vacancy-detail-modal
          [vacancyId]="vacancyId"
          (close)="selectedVacancyId.set(null)"
        />
      }
  
    </div>
  `,
})
export class CandidateSavedVacanciesPage {
  private readonly api = inject(CandidateSavedVacanciesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly items = signal<SavedVacancyItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);
  protected readonly total = signal(0);
  /** Id de vacante cuyo "Quitar" está en curso. */
  protected readonly removing = signal<string | null>(null);
  protected readonly selectedVacancyId = signal<string | null>(null);

  constructor() {
    // Ruta Client (área privada): se puede cargar desde el constructor.
    this.load(1);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);

    this.api
      .list(page, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar tus vacantes guardadas.');
        },
      });
  }

  protected vacancyIdOf(item: SavedVacancyItem): string {
    return item.vacancy?.id ?? item.id;
  }

  protected savedDate(item: SavedVacancyItem): string {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(
      new Date(item.savedAt),
    );
  }

  protected openDetail(vacancyId: string): void {
    this.selectedVacancyId.set(vacancyId);
  }

  protected remove(item: SavedVacancyItem): void {
    const vacancyId = item.vacancy?.id;
    if (!vacancyId) {
      // Vacante purgada: no hay endpoint por fila; se recarga tras limpiar.
      return;
    }
    this.removing.set(vacancyId);
    this.api
      .remove(vacancyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removing.set(null);
          // Actualización optimista + recarga si la página quedó vacía.
          this.items.update((rows) => rows.filter((row) => row.id !== item.id));
          this.total.update((count) => Math.max(0, count - 1));
          if (this.items().length === 0 && this.page() > 1) {
            this.load(this.page() - 1);
          }
        },
        error: () => this.removing.set(null),
      });
  }
}
