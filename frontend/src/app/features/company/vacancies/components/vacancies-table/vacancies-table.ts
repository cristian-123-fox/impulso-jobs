import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  EMPLOYMENT_TYPE_LABELS,
  VACANCY_STATUS_LABELS,
  Vacancy,
  VacancyStatus,
  WORK_MODE_LABELS,
} from '@/features/company/vacancies/models/vacancies.models';

const STATUS_BADGE: Record<VacancyStatus, string> = {
  [VacancyStatus.ACTIVE]: 'bg-accent-green-soft text-accent-green',
  [VacancyStatus.PAUSED]: 'bg-accent-amber-soft text-[#b26a15]',
  [VacancyStatus.CLOSED]: 'bg-surface text-muted',
};

/** Acción solicitada sobre una vacante desde la tabla. */
export type VacancyAction =
  | 'open'
  | 'edit'
  | 'pause'
  | 'reactivate'
  | 'refresh'
  | 'close';

export interface VacancyActionEvent {
  action: VacancyAction;
  vacancy: Vacancy;
}

/** Tabla de vacantes de la empresa. Presentacional: sólo emite intenciones. */
@Component({
  selector: 'app-vacancies-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            @for (h of headers; track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (vacancy of vacancies(); track vacancy.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-ink-900 transition-colors hover:text-brand"
                  (click)="emit('open', vacancy)"
                >
                  {{ vacancy.title }}
                </button>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  @if (vacancy.isFeatured) {
                    <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                      Destacada
                    </span>
                  }
                  @if (vacancy.isUrgent) {
                    <span class="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                      Urgente
                    </span>
                  }
                  @if (vacancy.isConfidential) {
                    <span class="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                      Confidencial
                    </span>
                  }
                </div>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ employmentLabel(vacancy) }} · {{ workModeLabel(vacancy) }}
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ vacancy.municipality }}
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                  [class]="statusBadge(vacancy.status)"
                >
                  {{ statusLabel(vacancy.status) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13px]">
                <span [class]="vacancy.pausesLeft ? 'text-body' : 'text-red-600'">
                  {{ vacancy.pauseCount }}/{{ vacancy.maxPauses }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ vacancy.refreshedAt || vacancy.createdAt | date: 'dd MMM yyyy' }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  @if (vacancy.status !== closed) {
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Editar"
                      aria-label="Editar vacante"
                      (click)="emit('edit', vacancy)"
                    >
                      <ij-icon name="pen" [size]="15" />
                    </button>
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Volver a subir en el listado"
                      aria-label="Refrescar vacante"
                      (click)="emit('refresh', vacancy)"
                    >
                      <ij-icon name="flash" [size]="15" />
                    </button>
                  }
                  @if (vacancy.status === active) {
                    <button
                      type="button"
                      [class]="actionClass"
                      [title]="pauseTitle(vacancy)"
                      aria-label="Pausar vacante"
                      [disabled]="!vacancy.pausesLeft"
                      (click)="emit('pause', vacancy)"
                    >
                      <ij-icon name="pause" [size]="15" />
                    </button>
                  }
                  @if (vacancy.status === paused) {
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Reactivar"
                      aria-label="Reactivar vacante"
                      (click)="emit('reactivate', vacancy)"
                    >
                      <ij-icon name="check" [size]="15" />
                    </button>
                  }
                  @if (vacancy.status !== closed) {
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Cerrar vacante"
                      aria-label="Cerrar vacante"
                      (click)="emit('close', vacancy)"
                    >
                      <ij-icon name="x" [size]="16" />
                    </button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="px-5 py-10 text-center text-[13.5px] text-muted">
                No hay vacantes que coincidan con los filtros.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VacanciesTable {
  readonly vacancies = input.required<readonly Vacancy[]>();
  readonly action = output<VacancyActionEvent>();

  protected readonly active = VacancyStatus.ACTIVE;
  protected readonly paused = VacancyStatus.PAUSED;
  protected readonly closed = VacancyStatus.CLOSED;

  protected readonly headers = [
    'Vacante',
    'Tipo',
    'Ubicación',
    'Estado',
    'Pausas',
    'Actualizada',
    '',
  ];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand ' +
    'disabled:cursor-not-allowed disabled:opacity-40';

  protected statusLabel(status: VacancyStatus): string {
    return VACANCY_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: VacancyStatus): string {
    return STATUS_BADGE[status] ?? STATUS_BADGE[VacancyStatus.CLOSED];
  }

  protected employmentLabel(vacancy: Vacancy): string {
    return EMPLOYMENT_TYPE_LABELS[vacancy.employmentType] ?? vacancy.employmentType;
  }

  protected workModeLabel(vacancy: Vacancy): string {
    return WORK_MODE_LABELS[vacancy.workMode] ?? vacancy.workMode;
  }

  protected pauseTitle(vacancy: Vacancy): string {
    return vacancy.pausesLeft
      ? `Pausar (te quedan ${vacancy.pausesLeft})`
      : 'Agotaste las pausas de tu plan';
  }

  protected emit(action: VacancyAction, vacancy: Vacancy): void {
    this.action.emit({ action, vacancy });
  }
}
