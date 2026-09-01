import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  ContractType,
  DEFAULT_MAX_PAUSES,
  EducationLevel,
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import {
  CompanyVacanciesUseCase,
  VacancyData,
} from '@/modules/vacancies/use-cases/company-vacancies.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const data = (overrides: Partial<VacancyData> = {}): VacancyData => ({
  title: '  Desarrollador Frontend  ',
  description: 'Descripción de la vacante',
  employmentType: EmploymentType.FULL_TIME,
  workMode: WorkMode.HYBRID,
  state: 'JAL',
  municipality: 'Zapopan',
  experienceLevel: ExperienceLevel.SENIOR,
  professionalAreaId: 13,
  contractType: ContractType.INDEFINITE,
  ...overrides,
});

const actor = { userId: 'user-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('CompanyVacanciesUseCase', () => {
  let vacancies: jest.Mocked<IVacancyRepository>;
  let ownership: jest.Mocked<VacancyOwnershipService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CompanyVacanciesUseCase;

  beforeEach(() => {
    vacancies = {
      save: jest.fn((v: Vacancy) =>
        Promise.resolve(
          Object.assign(v, { id: v.id || 'vac-1', createdAt: new Date() }),
        ),
      ),
      findAndCountByCompany: jest.fn().mockResolvedValue([[], 0]),
      countByCompany: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<IVacancyRepository>;
    ownership = {
      requireCompany: jest.fn().mockResolvedValue({ id: 'company-1' }),
      requireOwnVacancy: jest.fn(),
    } as unknown as jest.Mocked<VacancyOwnershipService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new CompanyVacanciesUseCase(vacancies, ownership, audit);
  });

  it('publica la vacante activa, con fecha de publicación y refresco', async () => {
    const result = await useCase.create(data(), actor);

    expect(result).toMatchObject({
      title: 'Desarrollador Frontend',
      status: VacancyStatus.ACTIVE,
      companyId: 'company-1',
      pauseCount: 0,
      maxPauses: DEFAULT_MAX_PAUSES,
    });
    // Sin `refreshedAt` el orden del portal dependería de nulos.
    expect(result.refreshedAt).not.toBeNull();
    expect(result.publishedAt).not.toBeNull();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'vacancies.create' }),
    );
  });

  it('nace sin distintivos: los otorga el plan, no el formulario', async () => {
    const result = await useCase.create(data(), actor);

    expect(result.isFeatured).toBe(false);
    expect(result.isUrgent).toBe(false);
    expect(result.isConfidential).toBe(false);
    expect(result.isVerified).toBe(false);
  });

  it('guarda el perfil de la posición (T15) con sus defaults', async () => {
    const result = await useCase.create(
      data({
        minEducationLevel: EducationLevel.BACHELOR,
        hasCommissions: true,
      }),
      actor,
    );

    expect(result).toMatchObject({
      professionalAreaId: 13,
      contractType: ContractType.INDEFINITE,
      minEducationLevel: EducationLevel.BACHELOR,
      hasCommissions: true,
      positionsCount: 1,
      applicationDeadline: null,
    });
  });

  it('rechaza una fecha límite en el pasado', async () => {
    const thrown = await useCase
      .create(data({ applicationDeadline: '2000-01-01' }), actor)
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_INVALID_DEADLINE);
    expect(vacancies.save).not.toHaveBeenCalled();
  });

  it('rechaza un rango de salario invertido', async () => {
    const thrown = await useCase
      .create(data({ salaryMin: 90000, salaryMax: 45000 }), actor)
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_INVALID_SALARY_RANGE);
    expect(vacancies.save).not.toHaveBeenCalled();
  });

  it('no permite editar una vacante cerrada', async () => {
    ownership.requireOwnVacancy.mockResolvedValue(
      Object.assign(new Vacancy(), {
        id: 'vac-1',
        companyId: 'company-1',
        status: VacancyStatus.CLOSED,
      }),
    );

    const thrown = await useCase
      .update('vac-1', data(), actor)
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_CLOSED);
    expect(vacancies.save).not.toHaveBeenCalled();
  });

  it('el listado va siempre acotado a la empresa del usuario', async () => {
    await useCase.list({ ...actor, page: 1, limit: 10 });

    expect(vacancies.findAndCountByCompany).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-1' }),
    );
  });
});
