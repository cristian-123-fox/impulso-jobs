import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { ISavedVacancyRepository } from '@/modules/candidates/repositories/saved-vacancy.repository.interface';
import { SavedVacanciesUseCase } from '@/modules/candidates/use-cases/saved-vacancies.use-case';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function vacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return Object.assign(new Vacancy(), {
    id: 'vac-1',
    companyId: 'company-1',
    title: 'Desarrollador Frontend',
    status: VacancyStatus.ACTIVE,
    isConfidential: false,
    ...overrides,
  });
}

function savedRow(overrides: Partial<SavedVacancy> = {}): SavedVacancy {
  return Object.assign(new SavedVacancy(), {
    id: 'saved-1',
    candidateProfileId: 'profile-1',
    vacancyId: 'vac-1',
    createdAt: new Date(),
    ...overrides,
  });
}

const actor = {
  userId: 'user-1',
  role: Role.CANDIDATE,
  ip: '127.0.0.1',
  userAgent: 'jest',
};

describe('SavedVacanciesUseCase', () => {
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let saved: jest.Mocked<ISavedVacancyRepository>;
  let vacancies: jest.Mocked<IVacancyRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: SavedVacanciesUseCase;

  beforeEach(() => {
    profiles = {
      findByUserId: jest
        .fn()
        .mockResolvedValue(
          Object.assign(new CandidateProfile(), { id: 'profile-1' }),
        ),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;
    saved = {
      findByProfileAndVacancy: jest.fn().mockResolvedValue(null),
      findAndCountByProfile: jest.fn().mockResolvedValue([[], 0]),
      findVacancyIdsByProfile: jest.fn().mockResolvedValue([]),
      save: jest.fn((row: SavedVacancy) =>
        Promise.resolve(
          Object.assign(row, {
            id: row.id || 'saved-1',
            createdAt: new Date(),
          }),
        ),
      ),
      deleteByProfileAndVacancy: jest.fn().mockResolvedValue(undefined),
    };
    vacancies = {
      findPublicById: jest.fn().mockResolvedValue(vacancy()),
      findByIds: jest.fn().mockResolvedValue([vacancy()]),
    } as unknown as jest.Mocked<IVacancyRepository>;
    companies = {
      findById: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICompanyRepository>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new SavedVacanciesUseCase(
      profiles,
      saved,
      vacancies,
      companies,
      audit,
    );
  });

  it('guarda una vacante activa y audita', async () => {
    const result = await useCase.add('vac-1', actor);

    expect(result.vacancy?.title).toBe('Desarrollador Frontend');
    expect(result.isActive).toBe(true);
    expect(saved.save).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.saved_vacancies.add' }),
    );
  });

  it('guardar dos veces es idempotente: no duplica la fila', async () => {
    saved.findByProfileAndVacancy.mockResolvedValue(savedRow());

    const result = await useCase.add('vac-1', actor);

    expect(result.id).toBe('saved-1');
    expect(saved.save).not.toHaveBeenCalled();
  });

  it('una vacante no visible en el portal responde 404', async () => {
    vacancies.findPublicById.mockResolvedValue(null);

    const thrown = await useCase.add('vac-1', actor).catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_NOT_FOUND);
    expect(saved.save).not.toHaveBeenCalled();
  });

  it('sólo los candidatos guardan vacantes', async () => {
    const thrown = await useCase
      .add('vac-1', { ...actor, role: Role.EMPLOYER })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.FORBIDDEN);
  });

  it('el listado marca inactiva la vacante que ya cerró', async () => {
    saved.findAndCountByProfile.mockResolvedValue([[savedRow()], 1]);
    vacancies.findByIds.mockResolvedValue([
      vacancy({ status: VacancyStatus.CLOSED }),
    ]);

    const result = await useCase.list({ page: 1, limit: 10, ...actor });

    expect(result.items[0].isActive).toBe(false);
    expect(result.items[0].vacancy).not.toBeNull();
  });

  it('quitar lo no guardado no falla (idempotente)', async () => {
    await expect(useCase.remove('vac-x', actor)).resolves.toBeUndefined();
    expect(saved.deleteByProfileAndVacancy).toHaveBeenCalledWith(
      'profile-1',
      'vac-x',
    );
  });
});
