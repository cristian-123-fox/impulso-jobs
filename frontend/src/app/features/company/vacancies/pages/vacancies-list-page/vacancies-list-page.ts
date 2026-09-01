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
import { VacancyForm } from '@/features/company/vacancies/components/vacancy-form/vacancy-form';
import { VacancyQuestionsForm } from '@/features/company/vacancies/components/vacancy-questions-form/vacancy-questions-form';
import {
  VacanciesTable,
  VacancyActionEvent,
} from '@/features/company/vacancies/components/vacancies-table/vacancies-table';
import {
  SaveVacancyPayload,
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
    VacancyForm,
    VacancyQuestionsForm,
    IjButton,
    IjIcon,
    IjModal,
    IjSelect,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Mis vacantes</h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
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
            class="flex items-center gap-3.5 rounded-2xl bg-white p-4 text-left shadow-card transition-colors hover:bg-surface"
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

      <form
        class="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-card md:grid-cols-[1fr_200px_auto]"
        (ngSubmit)="facade.applyFilters()"
      >
        <label class="relative block">
          <span class="sr-only">Buscar vacante</span>
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <ij-icon name="search" [size]="17" />
          </span>
          <input
            type="search"
            name="search"
            placeholder="Buscar por título…"
            class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
            [ngModel]="facade.search()"
            (ngModelChange)="facade.search.set($event)"
          />
        </label>
        <ij-select
          name="status"
          placeholder="Todos los estados"
          [options]="statusOptions"
          [searchable]="false"
          [ngModel]="facade.status()"
          (ngModelChange)="facade.status.set($event)"
        />
        <div class="flex items-center gap-2">
          <button
            type="submit"
            class="h-[46px] rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            Filtrar
          </button>
          <button
            type="button"
            class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
            (click)="facade.clearFilters()"
          >
            Limpiar
          </button>
        </div>
      </form>

      @switch (facade.state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando vacantes…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudieron cargar las vacantes.
          </div>
        }
        @default {
          <app-vacancies-table
            [vacancies]="facade.vacancies()"
            (action)="onAction($event)"
          />
          <app-admin-pagination
            [page]="facade.page()"
            [pages]="facade.pages()"
            [total]="facade.total()"
            (pageChange)="facade.load($event)"
          />
        }
      }
    </div>

    @if (formOpen()) {
      <ij-modal
        [title]="editing() ? 'Editar vacante' : 'Nueva vacante'"
        [subtitle]="editing()?.title ?? 'Se publicará de inmediato en el portal.'"
        size="lg"
        (close)="closeForm()"
      >
        <app-vacancy-form
          [vacancy]="editing()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSave($event)"
          (cancel)="closeForm()"
        />
      </ij-modal>
    }

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

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Vacancy | null>(null);
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

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onAction(event: VacancyActionEvent): void {
    const { action, vacancy } = event;
    switch (action) {
      case 'open':
        void this.router.navigate(['/empresa/vacantes', vacancy.id]);
        return;
      case 'edit':
        this.editing.set(vacancy);
        this.formError.set(null);
        this.formOpen.set(true);
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

  protected onSave(payload: SaveVacancyPayload): void {
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);

    const request = editing
      ? this.facade.update(editing.id, payload)
      : this.facade.create(payload);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.facade.load(editing ? this.facade.page() : 1);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(
          this.messageOf(error, 'No se pudo guardar la vacante.'),
        );
      },
    });
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
