export const COMPANY_DASHBOARD_REPOSITORY = 'COMPANY_DASHBOARD_REPOSITORY';

export interface CountByKey {
  key: string;
  count: number;
}

export interface DailyCount {
  /** `YYYY-MM-DD`, ya normalizado (MySQL y PostgreSQL no coinciden en tipo). */
  date: string;
  count: number;
}

export interface VacancyPerformanceRow {
  id: string;
  title: string;
  status: string;
  views: number;
  applications: number;
}

export interface ExpiringVacancyRow {
  id: string;
  title: string;
  expiresAt: Date;
  applications: number;
}

/**
 * Consultas **agregadas** para el panel de la empresa: conteos, sumas y series
 * por día. Son de sólo lectura y en lote, sobre las entidades `Vacancy` y
 * `CandidateApplication`.
 *
 * Vive aquí y no en `vacancies/` o `applications/` por el mismo motivo que
 * `ICompanyPlanRepository`: el panel necesita cruzar los dos dominios, e
 * importar sus *módulos* desde uno de ellos cerraría un ciclo de DI. Importar
 * la clase de entidad no lo cierra.
 *
 * Ninguna de estas consultas trae filas de detalle: un panel que cargara las
 * postulaciones para contarlas en memoria se caería con la primera empresa que
 * tenga miles.
 */
export interface ICompanyDashboardRepository {
  /** Vacantes por estado (`ACTIVE`, `PAUSED`, `CLOSED`, …). */
  countVacanciesByStatus(companyId: string): Promise<CountByKey[]>;
  /** Suma de `views_count`. Se consolida una vez al día (T18). */
  sumVacancyViews(companyId: string): Promise<number>;
  countApplications(companyId: string): Promise<number>;
  /** Postulaciones que nadie de la empresa ha abierto (`read_at` nulo). */
  countUnreadApplications(companyId: string): Promise<number>;
  countApplicationsSince(companyId: string, since: Date): Promise<number>;
  countApplicationsByStatus(companyId: string): Promise<CountByKey[]>;
  /** Serie diaria de postulaciones en el rango, **sin rellenar** los huecos. */
  applicationsPerDay(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<DailyCount[]>;
  /** Vacantes con más postulaciones (desempate por vistas). */
  topVacancies(
    companyId: string,
    limit: number,
  ): Promise<VacancyPerformanceRow[]>;
  /** Vacantes activas que vencen dentro de la ventana dada. */
  expiringVacancies(
    companyId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<ExpiringVacancyRow[]>;
}
