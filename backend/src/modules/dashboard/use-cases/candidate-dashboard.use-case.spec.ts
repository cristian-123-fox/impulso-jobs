import { AppException } from '@/common/exceptions/app.exception';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { IApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository.interface';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ICandidateDashboardRepository } from '@/modules/dashboard/repositories/candidate-dashboard.repository.interface';
import { CandidateDashboardUseCase } from '@/modules/dashboard/use-cases/candidate-dashboard.use-case';

function statusOf(
  code: string,
  name: string,
  isFinal = false,
): ApplicationStatus {
  return Object.assign(new ApplicationStatus(), {
    code,
    name,
    description: null,
    sortOrder: 1,
    isFinal,
  });
}

function profileOf(
  overrides: Partial<CandidateProfile> = {},
): CandidateProfile {
  return Object.assign(new CandidateProfile(), {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'Ana',
    lastName: 'López',
    professionalTitle: null,
    summary: null,
    phone: null,
    profilePhotoUrl: null,
    ...overrides,
  });
}

describe('CandidateDashboardUseCase', () => {
  let dashboard: jest.Mocked<ICandidateDashboardRepository>;
  let statuses: jest.Mocked<IApplicationStatusRepository>;
  let useCase: CandidateDashboardUseCase;

  const now = new Date('2026-09-20T15:00:00.000Z');

  beforeEach(() => {
    dashboard = {
      findProfileByUserId: jest.fn().mockResolvedValue(profileOf()),
      countApplications: jest.fn().mockResolvedValue(5),
      countApplicationsByStatus: jest.fn().mockResolvedValue([
        { key: 'IN_REVIEW', count: 3 },
        { key: 'REJECTED', count: 2 },
      ]),
      applicationsPerDay: jest
        .fn()
        .mockResolvedValue([{ date: '2026-09-20', count: 1 }]),
      countSavedVacancies: jest.fn().mockResolvedValue(4),
      profileSections: jest.fn().mockResolvedValue({
        experiences: 1,
        educations: 0,
        languages: 0,
        skills: 0,
        resumes: 0,
      }),
      profileViews: jest.fn().mockResolvedValue({
        total: 6,
        recent: 2,
        lastViewedAt: new Date('2026-09-19T10:00:00.000Z'),
      }),
    };

    statuses = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          statusOf('IN_REVIEW', 'En revisión'),
          statusOf('INTERVIEW', 'Entrevista'),
          statusOf('REJECTED', 'Rechazado', true),
        ]),
      findByCode: jest.fn(),
    };

    useCase = new CandidateDashboardUseCase(dashboard, statuses);
  });

  /** Lo que de verdad le importa: cuántas candidaturas siguen vivas. */
  it('cuenta como activas sólo las que no están en un estado terminal', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 7 }, now);

    expect(result.kpis).toEqual({
      totalApplications: 5,
      activeApplications: 3,
      newApplications: 1,
      savedVacancies: 4,
    });
  });

  it('mide la completitud del perfil como lista de tareas', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    // 1 de 9: sólo tiene experiencia laboral registrada.
    expect(result.profileCompletion.completed).toBe(1);
    expect(result.profileCompletion.total).toBe(9);
    expect(result.profileCompletion.percent).toBe(11);
    expect(
      result.profileCompletion.tasks.find((task) => task.key === 'resumes'),
    ).toEqual({
      key: 'resumes',
      label: 'Sube tu hoja de vida',
      route: '/candidato/cv',
      done: false,
    });
  });

  it('sube el porcentaje al completar más secciones', async () => {
    dashboard.findProfileByUserId.mockResolvedValue(
      profileOf({
        professionalTitle: 'Contadora',
        summary: 'Diez años de experiencia',
        phone: '+523312345678',
        profilePhotoUrl: 'https://cdn/foto.jpg',
      }),
    );
    dashboard.profileSections.mockResolvedValue({
      experiences: 2,
      educations: 1,
      languages: 1,
      skills: 3,
      resumes: 1,
    });

    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    expect(result.profileCompletion.percent).toBe(100);
  });

  it('expone cuántas empresas han abierto su CV', async () => {
    const result = await useCase.execute({ userId: 'user-1', days: 30 }, now);

    expect(result.profileViews).toEqual({
      total: 6,
      recent: 2,
      lastViewedAt: '2026-09-19T10:00:00.000Z',
    });
  });

  it('rechaza con 404 a un usuario sin perfil de aspirante', async () => {
    dashboard.findProfileByUserId.mockResolvedValue(null);

    const thrown = await useCase
      .execute({ userId: 'user-1', days: 30 }, now)
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).getStatus()).toBe(404);
  });
});
