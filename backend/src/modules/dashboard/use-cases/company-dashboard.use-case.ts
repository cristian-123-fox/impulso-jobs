import { Inject, Injectable } from '@nestjs/common';
import {
  type IApplicationStatusRepository,
  APPLICATION_STATUS_REPOSITORY,
} from '@/modules/applications/repositories/application-status.repository.interface';
import {
  type ICompanyPlanRepository,
  COMPANY_PLAN_REPOSITORY,
} from '@/modules/companies/repositories/company-plan.repository.interface';
import {
  type ICompanyDashboardRepository,
  COMPANY_DASHBOARD_REPOSITORY,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import { CompanyDashboardResponseDto } from '@/modules/dashboard/dto/company-dashboard-response.dto';
import {
  DAY_MS,
  daysUntil,
  fillDailyGaps,
  periodStart,
} from '@/modules/dashboard/use-cases/period.util';
import { TalentQuotaService } from '@/modules/talent/services/talent-quota.service';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';

export interface CompanyDashboardQuery {
  userId: string;
  /** Ventana de la serie temporal y de "nuevas postulaciones". */
  days: number;
}

/** Ventana de aviso de vencimiento de vacantes, en días. */
const EXPIRING_WINDOW_DAYS = 14;
const TOP_VACANCIES = 5;
const EXPIRING_LIMIT = 5;

/**
 * Panel de inicio de la empresa: lo primero que ve al entrar a `/empresa`.
 *
 * Reúne en **una sola petición** lo que de otro modo serían cinco llamadas a
 * cinco listados, y todo sale de agregados en la base de datos — ninguna
 * consulta trae filas de detalle para contarlas después.
 *
 * Lo que **no** incluye a propósito: la actividad reciente (las últimas
 * postulaciones con nombre del candidato). Eso ya lo resuelve
 * `GET /company/applications?limit=5`, que además sabe resolver el perfil del
 * aspirante; duplicar aquí esa resolución sería mantener dos veces la misma
 * lógica para pintar cinco filas.
 */
@Injectable()
export class CompanyDashboardUseCase {
  constructor(
    private readonly ownership: VacancyOwnershipService,
    @Inject(COMPANY_DASHBOARD_REPOSITORY)
    private readonly dashboard: ICompanyDashboardRepository,
    @Inject(APPLICATION_STATUS_REPOSITORY)
    private readonly statuses: IApplicationStatusRepository,
    @Inject(COMPANY_PLAN_REPOSITORY)
    private readonly plans: ICompanyPlanRepository,
    private readonly quota: TalentQuotaService,
  ) {}

  async execute(
    query: CompanyDashboardQuery,
    now = new Date(),
  ): Promise<CompanyDashboardResponseDto> {
    const company = await this.ownership.requireCompany(query.userId);
    const companyId = company.id;

    const from = periodStart(now, query.days);
    const expiringUntil = new Date(
      now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS,
    );

    const [
      vacanciesByStatus,
      totalViews,
      totalApplications,
      unreadApplications,
      newApplications,
      applicationsByStatus,
      trend,
      topVacancies,
      expiring,
      statusCatalog,
      talentQuota,
      planMap,
    ] = await Promise.all([
      this.dashboard.countVacanciesByStatus(companyId),
      this.dashboard.sumVacancyViews(companyId),
      this.dashboard.countApplications(companyId),
      this.dashboard.countUnreadApplications(companyId),
      this.dashboard.countApplicationsSince(companyId, from),
      this.dashboard.countApplicationsByStatus(companyId),
      this.dashboard.applicationsPerDay(companyId, from, now),
      this.dashboard.topVacancies(companyId, TOP_VACANCIES),
      this.dashboard.expiringVacancies(
        companyId,
        now,
        expiringUntil,
        EXPIRING_LIMIT,
      ),
      this.statuses.findAll(),
      this.quota.summary(companyId, now),
      this.plans.findLiveByCompanyIds([companyId], now),
    ]);

    const byStatus = new Map(applicationsByStatus.map((r) => [r.key, r.count]));
    const vacancyCounts = new Map(
      vacanciesByStatus.map((r) => [r.key, r.count]),
    );
    const plan = planMap.get(companyId) ?? null;

    return {
      periodDays: query.days,
      kpis: {
        activeVacancies: vacancyCounts.get(VacancyStatus.ACTIVE) ?? 0,
        totalVacancies: sum([...vacancyCounts.values()]),
        totalApplications,
        newApplications,
        unreadApplications,
        totalViews,
      },
      // La serie se rellena con ceros: una gráfica que salta del día 3 al 9
      // dibuja una recta que miente sobre lo que pasó en medio.
      applicationsTrend: fillDailyGaps(trend, from, now),
      // Se recorre el catálogo, no lo que devolvió el GROUP BY: así el embudo
      // mantiene su orden y los estados sin postulaciones salen en 0 en vez de
      // desaparecer de la gráfica.
      applicationsByStatus: statusCatalog.map((status) => ({
        code: status.code,
        name: status.name,
        count: byStatus.get(status.code) ?? 0,
        isFinal: status.isFinal,
      })),
      vacanciesByStatus: vacanciesByStatus.map((row) => ({
        status: row.key,
        count: row.count,
      })),
      topVacancies,
      expiringVacancies: expiring.map((row) => ({
        id: row.id,
        title: row.title,
        expiresAt: row.expiresAt.toISOString(),
        daysLeft: Math.max(0, daysUntil(row.expiresAt, now)),
        applications: row.applications,
      })),
      talentQuota,
      plan: plan && {
        name: plan.planName,
        status: plan.status,
        endsAt: plan.currentPeriodEnd?.toISOString() ?? null,
        daysLeft: plan.currentPeriodEnd
          ? daysUntil(plan.currentPeriodEnd, now)
          : null,
        autoRenew: plan.autoRenew,
      },
    };
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
