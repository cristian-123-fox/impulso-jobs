/** Contrato de `GET /company/dashboard` (escrito a mano desde el Swagger). */

export interface DashboardKpis {
  activeVacancies: number;
  totalVacancies: number;
  totalApplications: number;
  newApplications: number;
  unreadApplications: number;
  totalViews: number;
}

export interface DashboardPoint {
  /** `YYYY-MM-DD`. La serie no tiene huecos: los días vacíos llegan en 0. */
  date: string;
  count: number;
}

export interface DashboardStatusSlice {
  code: string;
  name: string;
  count: number;
  isFinal: boolean;
}

export interface DashboardVacancySlice {
  status: string;
  count: number;
}

export interface DashboardTopVacancy {
  id: string;
  title: string;
  status: string;
  applications: number;
  views: number;
}

export interface DashboardExpiringVacancy {
  id: string;
  title: string;
  expiresAt: string;
  daysLeft: number;
  applications: number;
}

export interface DashboardQuota {
  totalVisits: number;
  usedVisits: number;
  /** `-1` = ilimitado. */
  remainingVisits: number;
  unlimited: boolean;
}

export interface DashboardPlan {
  name: string | null;
  status: string;
  endsAt: string | null;
  daysLeft: number | null;
  autoRenew: boolean;
}

export interface CompanyDashboard {
  periodDays: number;
  kpis: DashboardKpis;
  applicationsTrend: DashboardPoint[];
  applicationsByStatus: DashboardStatusSlice[];
  vacanciesByStatus: DashboardVacancySlice[];
  topVacancies: DashboardTopVacancy[];
  expiringVacancies: DashboardExpiringVacancy[];
  talentQuota: DashboardQuota;
  plan: DashboardPlan | null;
}

