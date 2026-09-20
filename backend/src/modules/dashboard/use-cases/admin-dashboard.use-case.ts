import { Inject, Injectable } from '@nestjs/common';
import { MX_STATES } from '@/common/catalogs/mx-states';
import { PROFESSIONAL_AREAS } from '@/common/catalogs/professional-areas';
import { Role } from '@/common/types/role.enum';
import { AdminDashboardResponseDto } from '@/modules/dashboard/dto/admin-dashboard-response.dto';
import {
  type IAdminDashboardRepository,
  ADMIN_DASHBOARD_REPOSITORY,
} from '@/modules/dashboard/repositories/admin-dashboard.repository.interface';
import {
  eachDay,
  fillDailyGaps,
  periodStart,
} from '@/modules/dashboard/use-cases/period.util';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';

export interface AdminDashboardQuery {
  days: number;
}

const TOP_AREAS = 5;
const TOP_STATES = 5;
const RECENT_COMPANIES = 5;

const ROLE_LABELS: Record<string, string> = {
  [Role.ADMIN]: 'Administradores',
  [Role.EMPLOYER]: 'Empresas',
  [Role.CANDIDATE]: 'Aspirantes',
};

/**
 * Orden de presentación de los tipos de cuenta, del más numeroso al menos.
 *
 * Son `string` y no `Role` a propósito: lo que devuelve un `GROUP BY` es texto
 * plano, y comparar texto contra un miembro de enum es justo lo que prohíbe
 * `no-unsafe-enum-comparison` — con razón, porque nada garantiza que la columna
 * contenga un valor del enum.
 */
const ROLE_ORDER: readonly string[] = [
  Role.CANDIDATE,
  Role.EMPLOYER,
  Role.ADMIN,
];
const CANDIDATE_ROLE: string = Role.CANDIDATE;
const EMPLOYER_ROLE: string = Role.EMPLOYER;

const AREA_NAMES = new Map(
  PROFESSIONAL_AREAS.map((area) => [String(area.id), area.name]),
);

const STATE_NAMES = new Map(MX_STATES.map((state) => [state.code, state.name]));

/**
 * Panel de inicio del back-office: el pulso de la plataforma entera.
 *
 * A diferencia del de la empresa, aquí **no hay filtro de propiedad**: es la
 * vista de gobierno, y por eso el endpoint exige rol ADMIN además del permiso.
 */
@Injectable()
export class AdminDashboardUseCase {
  constructor(
    @Inject(ADMIN_DASHBOARD_REPOSITORY)
    private readonly dashboard: IAdminDashboardRepository,
  ) {}

  async execute(
    query: AdminDashboardQuery,
    now = new Date(),
  ): Promise<AdminDashboardResponseDto> {
    const from = periodStart(now, query.days);

    const [
      usersByRole,
      signups,
      totalCompanies,
      companiesByState,
      vacanciesByStatus,
      totalApplications,
      applicationsTrend,
      pendingReports,
      areas,
      revenue,
      recentCompanies,
    ] = await Promise.all([
      this.dashboard.countUsersByRole(),
      this.dashboard.signupsPerDay(from, now),
      this.dashboard.countCompanies(),
      this.dashboard.countCompaniesByState(TOP_STATES),
      this.dashboard.countVacanciesByStatus(),
      this.dashboard.countApplications(),
      this.dashboard.applicationsPerDay(from, now),
      this.dashboard.countPendingReports(),
      this.dashboard.countVacanciesByArea(TOP_AREAS),
      this.dashboard.revenueBetween(from, now),
      this.dashboard.recentCompanies(RECENT_COMPANIES),
    ]);

    const vacancyCounts = new Map(
      vacanciesByStatus.map((row) => [row.key, row.count]),
    );

    return {
      periodDays: query.days,
      kpis: {
        totalUsers: sum(usersByRole.map((row) => row.count)),
        newUsers: sum(signups.map((row) => row.count)),
        totalCompanies,
        activeVacancies: vacancyCounts.get(VacancyStatus.ACTIVE) ?? 0,
        totalApplications,
        pendingReports,
      },
      signupsTrend: this.buildSignupTrend(signups, from, now),
      applicationsTrend: fillDailyGaps(applicationsTrend, from, now),
      // Se recorre un orden fijo, no el del GROUP BY: así los tres tipos de
      // cuenta salen siempre y en el mismo orden, aunque alguno esté a cero.
      usersByRole: ROLE_ORDER.map((role) => ({
        key: role,
        label: ROLE_LABELS[role] ?? role,
        count: usersByRole.find((row) => row.key === role)?.count ?? 0,
      })),
      companiesByState: companiesByState.map((row) => ({
        key: row.key,
        label: STATE_NAMES.get(row.key) ?? row.key,
        count: row.count,
      })),
      vacanciesByStatus: vacanciesByStatus.map((row) => ({
        status: row.key,
        count: row.count,
      })),
      topAreas: areas.map((row) => ({
        key: row.key,
        label: AREA_NAMES.get(row.key) ?? `Área ${row.key}`,
        count: row.count,
      })),
      revenue,
      recentCompanies: recentCompanies.map((row) => ({
        id: row.id,
        businessName: row.businessName,
        state: STATE_NAMES.get(row.state) ?? row.state,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Dos series sobre el mismo eje —aspirantes y empresas—, cada día presente
   * aunque no hubiera altas. Los administradores se omiten a propósito: son un
   * puñado y aplastarían la escala a cero.
   */
  private buildSignupTrend(
    rows: { date: string; role: string; count: number }[],
    from: Date,
    to: Date,
  ): { date: string; candidates: number; employers: number }[] {
    const byDate = new Map<string, { candidates: number; employers: number }>();
    for (const row of rows) {
      const entry = byDate.get(row.date) ?? { candidates: 0, employers: 0 };
      if (row.role === CANDIDATE_ROLE) entry.candidates += row.count;
      if (row.role === EMPLOYER_ROLE) entry.employers += row.count;
      byDate.set(row.date, entry);
    }

    return eachDay(from, to).map((date) => ({
      date,
      candidates: byDate.get(date)?.candidates ?? 0,
      employers: byDate.get(date)?.employers ?? 0,
    }));
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
