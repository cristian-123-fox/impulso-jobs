import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { IApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository.interface';
import { Company } from '@/modules/companies/entities/company.entity';
import { ICompanyPlanRepository } from '@/modules/companies/repositories/company-plan.repository.interface';
import { ICompanyDashboardRepository } from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import { CompanyDashboardUseCase } from '@/modules/dashboard/use-cases/company-dashboard.use-case';
import { TalentQuotaService } from '@/modules/talent/services/talent-quota.service';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

function statusOf(
  code: string,
  name: string,
  sortOrder: number,
  isFinal = false,
): ApplicationStatus {
  return Object.assign(new ApplicationStatus(), {
    code,
    name,
    description: null,
    sortOrder,
    isFinal,
  });
}

describe('CompanyDashboardUseCase', () => {
  let ownership: jest.Mocked<VacancyOwnershipService>;
  let dashboard: jest.Mocked<ICompanyDashboardRepository>;
  let statuses: jest.Mocked<IApplicationStatusRepository>;
  let plans: jest.Mocked<ICompanyPlanRepository>;
  let quota: jest.Mocked<TalentQuotaService>;
  let useCase: CompanyDashboardUseCase;

  // Un "ahora" fijo: la serie diaria se compara día a día.
  const now = new Date('2026-09-20T15:00:00.000Z');

  beforeEach(() => {
    ownership = {
      requireCompany: jest
        .fn()
        .mockResolvedValue(Object.assign(new Company(), { id: 'company-1' })),
      requireOwnVacancy: jest.fn(),
    } as unknown as jest.Mocked<VacancyOwnershipService>;

    dashboard = {
      countVacanciesByStatus: jest.fn().mockResolvedValue([
        { key: 'ACTIVE', count: 4 },
        { key: 'CLOSED', count: 2 },
      ]),
      sumVacancyViews: jest.fn().mockResolvedValue(150),
      countApplications: jest.fn().mockResolvedValue(20),
      countUnreadApplications: jest.fn().mockResolvedValue(3),
      countApplicationsSince: jest.fn().mockResolvedValue(6),
      countApplicationsByStatus: jest
        .fn()
        .mockResolvedValue([{ key: 'IN_REVIEW', count: 5 }]),
      applicationsPerDay: jest.fn().mockResolvedValue([
        { date: '2026-09-18', count: 2 },
        { date: '2026-09-20', count: 4 },
      ]),
      topVacancies: jest.fn().mockResolvedValue([]),
      expiringVacancies: jest.fn().mockResolvedValue([
        {
          id: 'vac-1',
          title: 'Cajero',
          expiresAt: new Date('2026-09-23T15:00:00.000Z'),
          applications: 2,
        },
      ]),
    };

    statuses = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          statusOf('IN_REVIEW', 'En revisión', 1),
          statusOf('INTERVIEW', 'Entrevista', 2),
          statusOf('REJECTED', 'Rechazado', 3, true),
        ]),
      findByCode: jest.fn(),
    };

    plans = {
      findLiveByCompanyIds: jest.fn().mockResolvedValue(new Map()),
    };

    quota = {
      summary: jest.fn().mockResolvedValue({
        totalVisits: 10,
        usedVisits: 4,
        remainingVisits: 6,
        unlimited: false,
      }),
    } as unknown as jest.Mocked<TalentQuotaService>;

    useCase = new CompanyDashboardUseCase(
      ownership,
      dashboard,
      statuses,
      plans,
      quota,
    );
  });

  it('resume los KPIs de la empresa de la sesión', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 7 }, now);

    expect(ownership.requireCompany).toHaveBeenCalledWith('user-1');
    expect(result.kpis).toEqual({
      activeVacancies: 4,
      totalVacancies: 6,
      totalApplications: 20,
      newApplications: 6,
      unreadApplications: 3,
      totalViews: 150,
    });
    expect(result.periodDays).toBe(7);
  });

  /** Una gráfica que salta del día 3 al 9 dibuja una recta que no ocurrió. */
  it('rellena con ceros los días sin postulaciones', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 7 }, now);

    expect(result.applicationsTrend).toHaveLength(7);
    expect(result.applicationsTrend.at(0)?.date).toBe('2026-09-14');
    expect(result.applicationsTrend.at(-1)).toEqual({
      date: '2026-09-20',
      count: 4,
    });
    expect(result.applicationsTrend).toContainEqual({
      date: '2026-09-19',
      count: 0,
    });
  });

  /**
   * El embudo se recorre desde el catálogo: un estado sin postulaciones debe
   * salir en 0, no desaparecer de la gráfica y descolocar el resto.
   */
  it('devuelve el embudo completo, con los estados vacíos en 0', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    expect(result.applicationsByStatus).toEqual([
      { code: 'IN_REVIEW', name: 'En revisión', count: 5, isFinal: false },
      { code: 'INTERVIEW', name: 'Entrevista', count: 0, isFinal: false },
      { code: 'REJECTED', name: 'Rechazado', count: 0, isFinal: true },
    ]);
  });

  it('calcula los días que faltan para que venza una vacante', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    expect(result.expiringVacancies).toEqual([
      expect.objectContaining({ id: 'vac-1', daysLeft: 3, applications: 2 }),
    ]);
  });

  it('deja el plan en null cuando la empresa no tiene suscripción vigente', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);
    expect(result.plan).toBeNull();
  });

  it('resume el plan vigente con los días restantes', async () => {
    plans.findLiveByCompanyIds.mockResolvedValue(
      new Map([
        [
          'company-1',
          {
            subscriptionId: 'sub-1',
            planId: 'plan-1',
            planName: 'Alta',
            planCode: 'HIGH',
            status: 'ACTIVE',
            currentPeriodEnd: new Date('2026-10-05T15:00:00.000Z'),
            autoRenew: true,
          },
        ],
      ]),
    );

    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    expect(result.plan).toEqual({
      name: 'Alta',
      status: 'ACTIVE',
      endsAt: '2026-10-05T15:00:00.000Z',
      daysLeft: 15,
      autoRenew: true,
    });
  });
});
