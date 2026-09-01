import { EntityManager } from 'typeorm';

export const VACANCY_VIEW_EVENT_REPOSITORY = 'VACANCY_VIEW_EVENT_REPOSITORY';

/** Vistas acumuladas de una vacante en el corte de consolidación. */
export interface VacancyViewGroup {
  vacancyId: string;
  views: number;
}

export interface IVacancyViewEventRepository {
  /** Registra una vista del detalle público. */
  record(vacancyId: string, manager?: EntityManager): Promise<void>;
  /** Vistas por vacante hasta el corte (para consolidar). */
  countGroupedUntil(
    cutoff: Date,
    manager?: EntityManager,
  ): Promise<VacancyViewGroup[]>;
  /** Borra los eventos ya consolidados (hasta el corte, inclusive). */
  deleteUntil(cutoff: Date, manager?: EntityManager): Promise<void>;
}
