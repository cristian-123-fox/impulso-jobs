/** Contrato de `GET /admin/dashboard` (escrito a mano desde el Swagger). */

export interface AdminKpis {
  totalUsers: number;
  newUsers: number;
  totalCompanies: number;
  activeVacancies: number;
  totalApplications: number;
  pendingReports: number;
}

export interface AdminSignupPoint {
  date: string;
  candidates: number;
  employers: number;
}

export interface AdminPoint {
  date: string;
  count: number;
}

export interface AdminNamedSlice {
  key: string;
  label: string;
  count: number;
}

export interface AdminVacancySlice {
  status: string;
  count: number;
}

export interface AdminRevenue {
  amount: number;
  orders: number;
}

export interface AdminRecentCompany {
  id: string;
  businessName: string;
  state: string;
  createdAt: string;
}

export interface AdminDashboard {
  periodDays: number;
  kpis: AdminKpis;
  signupsTrend: AdminSignupPoint[];
  applicationsTrend: AdminPoint[];
  usersByRole: AdminNamedSlice[];
  companiesByState: AdminNamedSlice[];
  vacanciesByStatus: AdminVacancySlice[];
  topAreas: AdminNamedSlice[];
  revenue: AdminRevenue;
  recentCompanies: AdminRecentCompany[];
}
