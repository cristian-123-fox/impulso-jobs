import {
  CountByKey,
  DailyCount,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';

export const ADMIN_DASHBOARD_REPOSITORY = 'ADMIN_DASHBOARD_REPOSITORY';

export interface RecentCompanyRow {
  id: string;
  businessName: string;
  /** Código de entidad federativa (ISO 3166-2:MX). */
  state: string;
  createdAt: Date;
}

export interface RevenueSummary {
  /** Suma de `total` de las órdenes pagadas en el periodo. */
  amount: number;
  orders: number;
}

/**
 * Agregados de **toda la plataforma** para el panel del back-office. Mismo
 * criterio que `ICompanyDashboardRepository`: sólo lectura, en lote y siempre
 * resuelto en la base de datos.
 *
 * Aquí no hay filtro por empresa — es la vista de gobierno —, así que cada
 * consulta recorre la tabla entera: todas son `COUNT`/`SUM` sobre columnas
 * indexadas, nunca un `find()` que traiga filas.
 */
export interface IAdminDashboardRepository {
  countUsersByRole(): Promise<CountByKey[]>;
  countUsersByStatus(): Promise<CountByKey[]>;
  /** Altas por día y rol, para la serie de crecimiento. */
  signupsPerDay(
    from: Date,
    to: Date,
  ): Promise<{ date: string; role: string; count: number }[]>;
  countCompanies(): Promise<number>;
  /**
   * Empresas por entidad federativa, de mayor a menor. `companies` no tiene
   * estado de alta —el alta es inmediata—, así que el reparto que dice algo es
   * el geográfico: dónde está la demanda.
   */
  countCompaniesByState(limit: number): Promise<CountByKey[]>;
  countVacanciesByStatus(): Promise<CountByKey[]>;
  countApplications(): Promise<number>;
  applicationsPerDay(from: Date, to: Date): Promise<DailyCount[]>;
  countPendingReports(): Promise<number>;
  /** Vacantes publicadas por área profesional (id del catálogo embebido). */
  countVacanciesByArea(limit: number): Promise<CountByKey[]>;
  /** Ingresos cobrados en el periodo. */
  revenueBetween(from: Date, to: Date): Promise<RevenueSummary>;
  recentCompanies(limit: number): Promise<RecentCompanyRow[]>;
}
