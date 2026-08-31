import { DatePipe } from '@angular/common';
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
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjModal, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { ApplicationsFacade } from '@/features/company/applications/data/applications.facade';
import { StatusForm } from '@/features/company/applications/components/status-form/status-form';
import {
  ApplicationActionEvent,
  ApplicationsTable,
} from '@/features/company/applications/components/applications-table/applications-table';
import {
  ApplicationStatusHistory,
  CompanyApplication,
} from '@/features/company/applications/models/applications.models';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';

/** Postulaciones recibidas: filtro por vacante/estado y cambio de estado. */
@Component({
  selector: 'app-applications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    AdminPagination,
    ApplicationsTable,
    StatusForm,
    IjButton,
    IjIcon,
    IjModal,
    IjSelect,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Postulaciones</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Aspirantes que aplicaron a tus vacantes. Mueve cada uno por tu proceso.
        </p>
      </div>

      <div class="mb-5 flex flex-wrap gap-2">
        <button type="button" [class]="tabClass('')" (click)="facade.filterByStatus('')">
          Todas
          <span class="ml-1.5 text-[12px] opacity-70">{{ facade.total() }}</span>
        </button>
        @for (status of facade.statuses(); track status.code) {
          <button
            type="button"
            [class]="tabClass(status.code)"
            (click)="facade.filterByStatus(status.code)"
          >
            {{ status.name }}
            <span class="ml-1.5 text-[12px] opacity-70">{{ countOf(status.code) }}</span>
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

      <div class="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-card md:grid-cols-[1fr_auto]">
        <ij-select
          name="vacancy"
          placeholder="Todas las vacantes"
          [options]="vacancyOptions()"
          [ngModel]="facade.vacancyId()"
          (ngModelChange)="facade.filterByVacancy($event)"
        />
        <button
          type="button"
          class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="facade.clearFilters()"
        >
          Limpiar filtros
        </button>
      </div>

      @switch (facade.state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando postulaciones…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudieron cargar las postulaciones.
          </div>
        }
        @default {
          <app-applications-table
            [applications]="facade.applications()"
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

    @if (editing(); as application) {
      <ij-modal
        title="Cambiar estado"
        [subtitle]="subtitleOf(application)"
        size="sm"
        (close)="closeModals()"
      >
        <app-status-form
          [application]="application"
          [statuses]="facade.statuses()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onChangeStatus(application, $event)"
          (cancel)="closeModals()"
        />
      </ij-modal>
    }

    @if (historyOf(); as application) {
      <ij-modal
        title="Historial de la postulación"
        [subtitle]="subtitleOf(application)"
        (close)="closeModals()"
      >
        @if (history().length === 0) {
          <p class="rounded-xl bg-surface px-4 py-6 text-center text-[13.5px] text-muted">
            Sin cambios de estado todavía.
          </p>
        } @else {
          <ol class="flex flex-col gap-3">
            @for (entry of history(); track entry.id) {
              <li class="flex gap-3 rounded-xl bg-surface px-4 py-3">
                <span
                  class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-brand"
                >
                  <ij-icon name="check" [size]="15" />
                </span>
                <div class="min-w-0">
                  <div class="text-[13.5px] font-semibold text-ink-900">
                    {{ entry.previousStatus?.name || 'Alta' }} →
                    {{ entry.currentStatus?.name || '—' }}
                  </div>
                  <div class="text-[12.5px] text-muted">
                    {{ entry.changedAt | date: 'dd MMM yyyy · HH:mm' }}
                  </div>
                </div>
              </li>
            }
          </ol>
        }

        <div class="mt-6 flex justify-end border-t border-line pt-4">
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            (click)="closeModals()"
          >
            Cerrar
          </button>
        </div>
      </ij-modal>
    }
  `,
})
export class ApplicationsPage {
  protected readonly facade = inject(ApplicationsFacade);
  private readonly vacanciesApi = inject(VacanciesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly editing = signal<CompanyApplication | null>(null);
  protected readonly historyOf = signal<CompanyApplication | null>(null);
  protected readonly history = signal<ApplicationStatusHistory[]>([]);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  private readonly vacancies = signal<readonly IjOption[]>([]);
  protected readonly vacancyOptions = computed<readonly IjOption[]>(() => [
    { value: '', label: 'Todas las vacantes' },
    ...this.vacancies(),
  ]);

  constructor() {
    this.facade.loadStatuses();
    this.facade.load(1);

    // El filtro por vacante necesita las de la empresa; el listado es corto.
    this.vacanciesApi
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) =>
        this.vacancies.set(
          result.items.map((vacancy) => ({
            value: vacancy.id,
            label: vacancy.title,
          })),
        ),
      );
  }

  protected countOf(code: string): number {
    return this.facade.stats()[code] ?? 0;
  }

  protected tabClass(code: string): string {
    const base =
      'rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors';
    return this.facade.status() === code
      ? `${base} bg-brand text-white`
      : `${base} bg-white text-body shadow-card hover:bg-surface`;
  }

  protected subtitleOf(application: CompanyApplication): string {
    const candidate = application.candidate;
    const name = candidate
      ? `${candidate.firstName} ${candidate.lastName}`.trim()
      : 'Aspirante';
    return `${name} · ${application.vacancy?.title ?? 'Vacante'}`;
  }

  protected onAction(event: ApplicationActionEvent): void {
    const { action, application } = event;
    if (action === 'status') {
      this.historyOf.set(null);
      this.formError.set(null);
      this.editing.set(application);
      return;
    }

    if (action === 'resume') {
      this.downloadResume(application);
      return;
    }

    this.editing.set(null);
    this.history.set([]);
    this.historyOf.set(application);
    this.facade
      .history(application.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.history.set(entries),
        error: () => this.history.set([]),
      });
  }

  protected onChangeStatus(
    application: CompanyApplication,
    status: string,
  ): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .changeStatus(application.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModals();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo cambiar el estado.'),
          );
        },
      });
  }

  protected closeModals(): void {
    this.editing.set(null);
    this.historyOf.set(null);
    this.formError.set(null);
  }

  private downloadResume(application: CompanyApplication): void {
    this.actionError.set(null);
    this.facade
      .downloadResume(application.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (download) => this.saveBlob(download.blob, download.fileName),
        error: () =>
          this.actionError.set(
            'No se pudo descargar el CV de esta postulación.',
          ),
      });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
