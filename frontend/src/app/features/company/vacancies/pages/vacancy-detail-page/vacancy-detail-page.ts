import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IjIcon } from '@/shared/ui';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  VACANCY_STATUS_LABELS,
  Vacancy,
  VacancyStatus,
  WORK_MODE_LABELS,
} from '@/features/company/vacancies/models/vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

const STATUS_BADGE: Record<VacancyStatus, string> = {
  [VacancyStatus.ACTIVE]: 'bg-accent-green-soft text-accent-green',
  [VacancyStatus.PAUSED]: 'bg-accent-amber-soft text-[#b26a15]',
  [VacancyStatus.CLOSED]: 'bg-surface text-muted',
};

/** Ficha de una vacante propia: condiciones, texto y estado del plan. */
@Component({
  selector: 'app-vacancy-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjIcon],
  template: `
    <div class="mx-auto max-w-[900px]">
      <a
        routerLink="/empresa/vacantes"
        class="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
      >
        <ij-icon name="chevron-left" [size]="16" />
        Mis vacantes
      </a>

      @switch (state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando vacante…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            {{ errorMessage() }}
          </div>
        }
        @default {
          @if (vacancy(); as data) {
            <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
                  {{ data.title }}
                </h1>
                <p class="mt-1.5 text-[13.5px] text-muted">
                  Publicada el {{ data.publishedAt | date: 'dd MMM yyyy' }} ·
                  actualizada el
                  {{ data.refreshedAt || data.createdAt | date: 'dd MMM yyyy' }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-md px-2.5 py-1 text-[12px] font-bold"
                  [class]="statusBadge(data.status)"
                >
                  {{ statusLabel(data.status) }}
                </span>
                @if (data.isFeatured) {
                  <span class="rounded-md bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand">
                    Destacada
                  </span>
                }
                @if (data.isUrgent) {
                  <span class="rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700">
                    Urgente
                  </span>
                }
                @if (data.isConfidential) {
                  <span class="rounded-md bg-surface px-2.5 py-1 text-[12px] font-bold text-muted">
                    Confidencial
                  </span>
                }
              </div>
            </div>

            <dl
              class="mb-5 grid gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3"
            >
              @for (item of details(data); track item.label) {
                <div>
                  <dt class="text-[11.5px] font-bold uppercase tracking-wide text-muted">
                    {{ item.label }}
                  </dt>
                  <dd class="mt-1 text-[13.5px] text-body">{{ item.value }}</dd>
                </div>
              }
            </dl>

            <div class="rounded-2xl bg-white p-6 shadow-card">
              <h2 class="text-base font-bold text-ink-900">Descripción</h2>
              <p class="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-body">
                {{ data.description }}
              </p>

              @if (data.requirements) {
                <h2 class="mt-6 text-base font-bold text-ink-900">Requisitos</h2>
                <p class="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-body">
                  {{ data.requirements }}
                </p>
              }
            </div>
          }
        }
      }
    </div>
  `,
})
export class VacancyDetailPage {
  private readonly api = inject(VacanciesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly vacancyId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly vacancy = signal<Vacancy | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly errorMessage = signal('No se pudo cargar la vacante.');

  constructor() {
    this.api
      .get(this.vacancyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vacancy) => {
          this.vacancy.set(vacancy);
          this.state.set('loaded');
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const body = error.error as ApiErrorResponse | null;
            this.errorMessage.set(
              body?.message ?? 'No se pudo cargar la vacante.',
            );
          }
          this.state.set('error');
        },
      });
  }

  protected statusLabel(status: VacancyStatus): string {
    return VACANCY_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: VacancyStatus): string {
    return STATUS_BADGE[status] ?? STATUS_BADGE[VacancyStatus.CLOSED];
  }

  protected details(
    vacancy: Vacancy,
  ): readonly { label: string; value: string }[] {
    return [
      {
        label: 'Contratación',
        value: EMPLOYMENT_TYPE_LABELS[vacancy.employmentType],
      },
      { label: 'Modalidad', value: WORK_MODE_LABELS[vacancy.workMode] },
      {
        label: 'Experiencia',
        value: EXPERIENCE_LEVEL_LABELS[vacancy.experienceLevel],
      },
      {
        label: 'Ubicación',
        value: `${STATE_NAMES.get(vacancy.state) ?? vacancy.state} · ${vacancy.municipality}`,
      },
      { label: 'Salario mensual', value: this.salary(vacancy) },
      {
        label: 'Pausas usadas',
        value: `${vacancy.pauseCount} de ${vacancy.maxPauses} (te quedan ${vacancy.pausesLeft})`,
      },
    ];
  }

  private salary(vacancy: Vacancy): string {
    if (vacancy.salaryHidden) return 'Oculto en el portal';
    const { salaryMin, salaryMax } = vacancy;
    if (salaryMin === null && salaryMax === null) return 'A convenir';
    const format = (amount: number) =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(amount);
    if (salaryMin !== null && salaryMax !== null) {
      return `${format(salaryMin)} – ${format(salaryMax)}`;
    }
    return format((salaryMin ?? salaryMax)!);
  }
}
