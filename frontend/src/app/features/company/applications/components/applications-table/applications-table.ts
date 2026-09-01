import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { CompanyApplication } from '@/features/company/applications/models/applications.models';

export type ApplicationAction = 'status' | 'history' | 'resume' | 'answers';

export interface ApplicationActionEvent {
  action: ApplicationAction;
  application: CompanyApplication;
}

/** Postulaciones recibidas. Presentacional: sólo emite intenciones. */
@Component({
  selector: 'app-applications-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[900px] border-collapse text-left">
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
          @for (item of applications(); track item.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-[13px] font-bold text-brand"
                  >
                    {{ initials(item) }}
                  </span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      @if (!item.readAt) {
                        <span
                          class="h-2 w-2 flex-shrink-0 rounded-full bg-brand"
                          title="Sin leer"
                        ></span>
                      }
                      <span
                        class="truncate text-sm text-ink-900"
                        [class.font-extrabold]="!item.readAt"
                        [class.font-semibold]="!!item.readAt"
                      >
                        {{ candidateName(item) }}
                      </span>
                    </div>
                    <div class="truncate text-[12.5px] text-muted">
                      {{ item.candidate?.professionalTitle || 'Sin título profesional' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ item.vacancy?.title || '—' }}
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                @if (item.candidate?.email; as email) {
                  {{ email }}
                } @else {
                  <span
                    class="text-[12.5px] text-muted"
                    title="Los datos de contacto son un beneficio del plan contratado."
                  >
                    Oculto por el plan
                  </span>
                }
              </td>
              <td class="px-5 py-3.5">
                @if (item.isExcluded) {
                  <span
                    class="inline-block rounded-md bg-red-50 px-2 py-1 text-[11.5px] font-bold text-red-700"
                    title="Una respuesta excluyente lo descartó del filtro"
                  >
                    Descartado
                  </span>
                } @else if (item.score !== null) {
                  <span
                    class="inline-block rounded-md bg-brand-50 px-2 py-1 text-[11.5px] font-bold text-brand"
                    title="Puntaje de las preguntas de filtrado"
                  >
                    {{ item.score }} pts
                  </span>
                } @else {
                  <span class="text-[12px] text-muted">—</span>
                }
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                  [class]="
                    item.status?.isFinal
                      ? 'bg-surface text-muted'
                      : 'bg-accent-blue-soft text-accent-blue'
                  "
                >
                  {{ item.status?.name || 'Sin estado' }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ item.appliedAt | date: 'dd MMM yyyy' }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  @if (item.score !== null || item.isExcluded) {
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Respuestas de filtrado"
                      aria-label="Respuestas de filtrado"
                      (click)="emit('answers', item)"
                    >
                      <ij-icon name="clipboard" [size]="15" />
                    </button>
                  }
                  <button
                    type="button"
                    [class]="actionClass + ' disabled:cursor-not-allowed disabled:opacity-40'"
                    [title]="
                      item.resume
                        ? 'Descargar CV: ' + item.resume.fileName
                        : 'La postulación no tiene CV adjunto'
                    "
                    aria-label="Descargar CV"
                    [disabled]="!item.resume"
                    (click)="emit('resume', item)"
                  >
                    <ij-icon name="file" [size]="15" />
                  </button>
                  <button
                    type="button"
                    [class]="actionClass"
                    title="Historial de estados"
                    aria-label="Historial de estados"
                    (click)="emit('history', item)"
                  >
                    <ij-icon name="history" [size]="15" />
                  </button>
                  <button
                    type="button"
                    class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    [title]="
                      item.status?.isFinal
                        ? 'La postulación ya está en un estado final'
                        : 'Cambiar el estado'
                    "
                    [disabled]="item.status?.isFinal"
                    (click)="emit('status', item)"
                  >
                    <ij-icon name="pen" [size]="14" />
                    Estado
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="px-5 py-10 text-center text-[13.5px] text-muted">
                No hay postulaciones que coincidan con los filtros.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ApplicationsTable {
  readonly applications = input.required<readonly CompanyApplication[]>();
  readonly action = output<ApplicationActionEvent>();

  protected readonly headers = [
    'Aspirante',
    'Vacante',
    'Contacto',
    'Filtro',
    'Estado',
    'Postuló',
    '',
  ];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand';

  protected candidateName(item: CompanyApplication): string {
    const candidate = item.candidate;
    if (!candidate) return 'Perfil no disponible';
    return `${candidate.firstName} ${candidate.lastName}`.trim();
  }

  protected initials(item: CompanyApplication): string {
    const candidate = item.candidate;
    if (!candidate) return '—';
    return (candidate.firstName[0] ?? '?')
      .concat(candidate.lastName[0] ?? '')
      .toUpperCase();
  }

  protected emit(
    action: ApplicationAction,
    application: CompanyApplication,
  ): void {
    this.action.emit({ action, application });
  }
}
