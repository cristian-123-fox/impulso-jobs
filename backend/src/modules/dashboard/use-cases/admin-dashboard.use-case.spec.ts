import { Role } from '@/common/types/role.enum';
import { IAdminDashboardRepository } from '@/modules/dashboard/repositories/admin-dashboard.repository.interface';
import { AdminDashboardUseCase } from '@/modules/dashboard/use-cases/admin-dashboard.use-case';

describe('AdminDashboardUseCase', () => {
  let dashboard: jest.Mocked<IAdminDashboardRepository>;
  let useCase: AdminDashboardUseCase;

  const now = new Date('2026-09-20T15:00:00.000Z');

  beforeEach(() => {
    dashboard = {
      countUsersByRole: jest.fn().mockResolvedValue([
        { key: Role.CANDIDATE, count: 120 },
        { key: Role.EMPLOYER, count: 18 },
      ]),
      countUsersByStatus: jest.fn().mockResolvedValue([]),
      signupsPerDay: jest.fn().mockResolvedValue([
        { date: '2026-09-19', role: Role.CANDIDATE, count: 3 },
        { date: '2026-09-19', role: Role.EMPLOYER, count: 1 },
        { date: '2026-09-20', role: Role.CANDIDATE, count: 2 },
      ]),
      countCompanies: jest.fn().mockResolvedValue(18),
      countCompaniesByState: jest
        .fn()
        .mockResolvedValue([{ key: 'JAL', count: 7 }]),
      countVacanciesByStatus: jest
        .fn()
        .mockResolvedValue([{ key: 'ACTIVE', count: 9 }]),
      countApplications: jest.fn().mockResolvedValue(64),
      applicationsPerDay: jest.fn().mockResolvedValue([]),
      countPendingReports: jest.fn().mockResolvedValue(2),
      countVacanciesByArea: jest
        .fn()
        .mockResolvedValue([{ key: '1', count: 4 }]),
      revenueBetween: jest.fn().mockResolvedValue({ amount: 12500, orders: 3 }),
      recentCompanies: jest.fn().mockResolvedValue([
        {
          id: 'c-1',
          businessName: 'ACME',
          state: 'JAL',
          createdAt: new Date('2026-09-18T10:00:00.000Z'),
        },
      ]),
    };

    useCase = new AdminDashboardUseCase(dashboard);
  });

  it('resume el pulso de la plataforma', async () => {
    const result = await useCase.execute({ days: 7 }, now);

    expect(result.kpis).toEqual({
      totalUsers: 138,
      newUsers: 6,
      totalCompanies: 18,
      activeVacancies: 9,
      totalApplications: 64,
      pendingReports: 2,
    });
  });

  /** Dos series sobre el mismo eje: cada día tiene que existir en ambas. */
  it('separa las altas por tipo de cuenta y rellena los días vacíos', async () => {
    const result = await useCase.execute({ days: 7 }, now);

    expect(result.signupsTrend).toHaveLength(7);
    expect(result.signupsTrend.at(-1)).toEqual({
      date: '2026-09-20',
      candidates: 2,
      employers: 0,
    });
    expect(result.signupsTrend.at(-2)).toEqual({
      date: '2026-09-19',
      candidates: 3,
      employers: 1,
    });
    expect(result.signupsTrend.at(0)).toEqual({
      date: '2026-09-14',
      candidates: 0,
      employers: 0,
    });
  });

  /** Los tres tipos de cuenta salen siempre, aunque alguno esté a cero. */
  it('devuelve los tres roles en orden fijo', async () => {
    const result = await useCase.execute({ days: 30 }, now);

    expect(result.usersByRole).toEqual([
      { key: Role.CANDIDATE, label: 'Aspirantes', count: 120 },
      { key: Role.EMPLOYER, label: 'Empresas', count: 18 },
      { key: Role.ADMIN, label: 'Administradores', count: 0 },
    ]);
  });

  it('resuelve los nombres de área y de entidad federativa', async () => {
    const result = await useCase.execute({ days: 30 }, now);

    expect(result.topAreas[0].label).toBe('Administración / Oficina');
    expect(result.companiesByState[0].label).toBe('Jalisco');
    expect(result.recentCompanies[0].state).toBe('Jalisco');
  });

  it('pide los ingresos del periodo, no de toda la historia', async () => {
    await useCase.execute({ days: 7 }, now);

    const [from, to] = dashboard.revenueBetween.mock.calls[0];
    expect(from.toISOString().slice(0, 10)).toBe('2026-09-14');
    expect(to).toBe(now);
  });
});
