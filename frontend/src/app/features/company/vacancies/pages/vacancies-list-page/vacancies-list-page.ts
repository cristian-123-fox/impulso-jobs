import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjModal, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import { VacanciesFacade } from '@/features/company/vacancies/data/vacancies.facade';
import { VacancyQuestionsForm } from '@/features/company/vacancies/components/vacancy-questions-form/vacancy-questions-form';
import {
  VacanciesTable,
  VacancyActionEvent,
} from '@/features/company/vacancies/components/vacancies-table/vacancies-table';
import {
  SaveVacancyQuestionPayload,
  VACANCY_STATUS_LABELS,
  Vacancy,
  VacancyQuestion,
  VacancyStatus,
} from '@/features/company/vacancies/models/vacancies.models';

@Component({
  selector: 'app-vacancies-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AdminPagination,
    VacanciesTable,
    VacancyQuestionsForm,
    IjButton,
    IjIcon,
    IjModal,
    IjSelect,
  ],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">Mis vacantes</h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            Publica, edita, pausa o cierra las vacantes de tu empresa.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="primary"
          shape="rounded"
          size="md"
          (click)="openCreate()"
        >
          <ij-icon name="plus" [size]="16" />
          Nueva vacante
        </button>
      </div>

      <div class="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of statCards(); track card.label) {
          <button
            type="button"
            class="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-left shadow-card transition-colors hover:bg-surface"
            [class.ring-2]="facade.status() === card.status"
            [class.ring-brand]="facade.status() === card.status"
            (click)="facade.filterByStatus(card.status)"
          >
            <span
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              [class]="card.tone"
            >
              <ij-icon [name]="card.icon" [size]="20" [strokeWidth]="1.9" />
            </span>
            <div>
              <div class="text-[21px] font-extrabold leading-tight text-ink-900">
                {{ card.value }}
              </div>
              <div class="text-[12.5px] text-muted">{{ card.label }}</div>
            </div>
          </button>
        }
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      <!-- Filtros, tabla y paginación en una caja: operan sobre el mismo listado. -->
      <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <form
          class="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3.5"
          (ngSubmit)="facade.applyFilters()"
        >
          <label
            class="flex h-[42px] min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-muted focus-within:border-brand"
          >
            <span class="sr-only">Buscar vacante</span>
            <ij-icon name="search" [size]="16" />
            <input
              type="search"
              name="search"
              placeholder="Buscar por título…"
              class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-ink-900 placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0"
              [ngModel]="facade.search()"
              (ngModelChange)="facade.search.set($event)"
            />
          </label>
          <ij-select
            class="w-[200px]"
            name="status"
            placeholder="Todos los estados"
            [options]="statusOptions"
            [searchable]="false"
            [ngModel]="facade.status()"
            (ngModelChange)="facade.status.set($event)"
          />
          <button
            type="submit"
            class="h-[42px] rounded-xl bg-brand-700 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-strong active:translate-y-px"
          >
            Buscar
          </button>
          <button
            type="button"
            class="h-[42px] rounded-xl px-3 text-[13px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
            (click)="facade.clearFilters()"
          >
            Limpiar
          </button>
        </form>

        @switch (facade.state()) {
          @case ('loading') {
            <div class="p-10 text-center text-[13.5px] text-muted">Cargando vacantes…</div>
          }
          @case ('error') {
            <div class="p-10 text-center text-[13.5px] font-medium text-red-600">
              No se pudieron cargar las vacantes.
            </div>
          }
          @default {
            <app-vacancies-table
              [vacancies]="facade.vacancies()"
              (action)="onAction($event)"
            />
            <app-admin-pagination
              [inCard]="true"
              [page]="facade.page()"
              [pages]="facade.pages()"
              [total]="facade.total()"
              (pageChange)="facade.load($event)"
            />
          }
        }
      </section>
    </div>

    @if (questionsFor(); as vacancy) {
      <ij-modal
        title="Preguntas de filtrado"
        [subtitle]="vacancy.title"
        size="lg"
        (close)="closeQuestions()"
      >
        <app-vacancy-questions-form
          [initial]="questionsData()"
          [submitting]="questionsSaving()"
          [error]="questionsError()"
          (save)="onSaveQuestions(vacancy, $event)"
          (cancel)="closeQuestions()"
        />
      </ij-modal>
    }
  `,
})
export class VacanciesListPage {
  protected readonly facade = inject(VacanciesFacade);
  private readonly vacanciesApi = inject(VacanciesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly questionsFor = signal<Vacancy | null>(null);
  protected readonly questionsData = signal<VacancyQuestion[]>([]);
  protected readonly questionsSaving = signal(false);
  protected readonly questionsError = signal<string | null>(null);

  protected readonly statusOptions: readonly IjOption[] = [
    { value: '', label: 'Todos los estados' },
    ...Object.values(VacancyStatus).map((status) => ({
      value: status,
      label: VACANCY_STATUS_LABELS[status],
    })),
  ];

  protected readonly statCards = computed(() => {
    const stats = this.facade.stats();
    return [
      {
        label: 'Todas',
        value: stats.total,
        icon: 'briefcase' as const,
        tone: 'bg-brand-50 text-brand',
        status: '' as const,
      },
      {
        label: 'Activas',
        value: stats.active,
        icon: 'check' as const,
        tone: 'bg-accent-green-soft text-accent-green',
        status: VacancyStatus.ACTIVE,
      },
      {
        label: 'Pausadas',
        value: stats.paused,
        icon: 'pause' as const,
        tone: 'bg-accent-amber-soft text-accent-amber',
        status: VacancyStatus.PAUSED,
      },
      {
        label: 'Cerradas',
        value: stats.closed,
        icon: 'file' as const,
        tone: 'bg-surface text-muted',
        status: VacancyStatus.CLOSED,
      },
    ];
  });

  constructor() {
    this.facade.load(1);
  }

  /**
   * T32: el alta y la edición viven en `/empresa/vacantes/nueva` y
   * `/empresa/vacantes/:id/editar`. El `ij-modal` que había aquí se retiró: 19
   * campos y tres editores enriquecidos no caben en un diálogo, que es la
   * excepción que CLAUDE.md contempla para sacar un formulario a ruta propia.
   */
  protected openCreate(): void {
    void this.router.navigate(['/empresa/vacantes/nueva']);
  }

  protected onAction(event: VacancyActionEvent): void {
    const { action, vacancy } = event;
    switch (action) {
      case 'open':
        void this.router.navigate(['/empresa/vacantes', vacancy.id]);
        return;
      case 'edit':
        void this.router.navigate(['/empresa/vacantes', vacancy.id, 'editar']);
        return;
      case 'questions':
        this.openQuestions(vacancy);
        return;
      case 'pause':
        this.run(this.facade.pause(vacancy.id), 'No se pudo pausar la vacante.');
        return;
      case 'reactivate':
        this.run(
          this.facade.reactivate(vacancy.id),
          'No se pudo reactivar la vacante.',
        );
        return;
      case 'refresh':
        this.run(
          this.facade.refresh(vacancy.id),
          'No se pudo actualizar la vacante.',
        );
        return;
      case 'close':
        if (
          !confirm(
            `¿Cerrar "${vacancy.title}"? Dejará de recibir postulaciones y no se puede reabrir.`,
          )
        ) {
          return;
        }
        this.run(this.facade.close(vacancy.id), 'No se pudo cerrar la vacante.');
    }
  }

  protected closeQuestions(): void {
    this.questionsFor.set(null);
    this.questionsData.set([]);
    this.questionsError.set(null);
  }

  private openQuestions(vacancy: Vacancy): void {
    this.actionError.set(null);
    this.vacanciesApi
      .getQuestions(vacancy.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (questions) => {
          this.questionsData.set(questions);
          this.questionsError.set(null);
          this.questionsFor.set(vacancy);
        },
        error: () =>
          this.actionError.set('No se pudieron cargar las preguntas.'),
      });
  }

  protected onSaveQuestions(
    vacancy: Vacancy,
    payload: SaveVacancyQuestionPayload[],
  ): void {
    this.questionsSaving.set(true);
    this.questionsError.set(null);
    this.vacanciesApi
      .saveQuestions(vacancy.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.questionsSaving.set(false);
          this.closeQuestions();
        },
        error: (error: unknown) => {
          this.questionsSaving.set(false);
          this.questionsError.set(
            this.messageOf(error, 'No se pudieron guardar las preguntas.'),
          );
        },
      });
  }

  /** Acciones de fila: refrescan sólo esa vacante y recalculan los totales. */
  private run(request: Observable<Vacancy>, fallback: string): void {
    this.actionError.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.facade.replace(updated);
        // Los totales por estado cambian con la acción.
        this.facade.load(this.facade.page());
      },
      error: (error: unknown) =>
        this.actionError.set(this.messageOf(error, fallback)),
    });
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
