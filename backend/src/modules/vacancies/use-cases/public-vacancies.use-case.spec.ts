import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Company } from '@/modules/companies/entities/company.entity';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { IVacancyViewEventRepository } from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';
import { PublicVacanciesUseCase } from '@/modules/vacancies/use-cases/public-vacancies.use-case';

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
    description: 'Descripción',
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.REMOTE,
    state: 'JAL',
    municipality: 'Zapopan',
    experienceLevel: ExperienceLevel.SENIOR,
    status: VacancyStatus.ACTIVE,
    salaryMin: '45000.00',
    salaryMax: '65000.00',
    salaryHidden: false,
    isVerified: false,
    isFeatured: false,
    isUrgent: false,
    isConfidential: false,
    pauseCount: 0,
    maxPauses: 2,
    canEditTitleOnReactivate: false,
    createdAt: new Date(),
    ...overrides,
  });
}

const NORTHWIND = Object.assign(new Company(), {
  id: 'company-1',
  businessName: 'Northwind MX',
  state: 'JAL',
  municipality: 'Zapopan',
});

describe('PublicVacanciesUseCase', () => {
  let vacancies: jest.Mocked<IVacancyRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let viewEvents: jest.Mocked<IVacancyViewEventRepository>;
  let useCase: PublicVacanciesUseCase;

  beforeEach(() => {
    vacancies = {
      findAndCountPublic: jest.fn().mockResolvedValue([[], 0]),
      findPublicById: jest.fn().mockResolvedValue(vacancy()),
    } as unknown as jest.Mocked<IVacancyRepository>;
    companies = {
      findByIds: jest.fn().mockResolvedValue([NORTHWIND]),
    } as unknown as jest.Mocked<ICompanyRepository>;
    viewEvents = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IVacancyViewEventRepository>;

    useCase = new PublicVacanciesUseCase(vacancies, companies, viewEvents);
  });

  it('muestra la empresa en una vacante normal', async () => {
    const result = await useCase.get('vac-1');

    expect(result.company).toMatchObject({ businessName: 'Northwind MX' });
    expect(result.salaryMin).toBe(45000);
  });

  it('el detalle registra un evento de vista (T18)', async () => {
    await useCase.get('vac-1');

    expect(viewEvents.record).toHaveBeenCalledWith('vac-1');
  });

  it('no registra vista si la vacante no existe', async () => {
    vacancies.findPublicById.mockResolvedValue(null);

    await useCase.get('vac-1').catch(() => undefined);

    expect(viewEvents.record).not.toHaveBeenCalled();
  });

  it('oculta la identidad de la empresa si la vacante es confidencial', async () => {
    vacancies.findPublicById.mockResolvedValue(
      vacancy({ isConfidential: true }),
    );

    const result = await useCase.get('vac-1');

    expect(result.company).toBeNull();
    expect(result.isConfidential).toBe(true);
    // Ni siquiera se consulta la empresa de una vacante confidencial.
    expect(companies.findByIds).toHaveBeenCalledWith([]);
  });

  it('omite el salario cuando la empresa lo marcó como oculto', async () => {
    vacancies.findPublicById.mockResolvedValue(vacancy({ salaryHidden: true }));

    const result = await useCase.get('vac-1');

    expect(result.salaryMin).toBeNull();
    expect(result.salaryMax).toBeNull();
  });

  it('devuelve 404 si la vacante no está activa o no existe', async () => {
    vacancies.findPublicById.mockResolvedValue(null);

    const thrown = await useCase.get('vac-1').catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_NOT_FOUND);
  });

  it('en el listado resuelve las empresas visibles en un solo lote', async () => {
    vacancies.findAndCountPublic.mockResolvedValue([
      [
        vacancy({ id: 'v1' }),
        vacancy({ id: 'v2', isConfidential: true }),
        vacancy({ id: 'v3' }),
      ],
      3,
    ]);

    const result = await useCase.list({ page: 1, limit: 10 });

    expect(companies.findByIds).toHaveBeenCalledTimes(1);
    expect(result.items.map((v) => v.company?.businessName ?? null)).toEqual([
      'Northwind MX',
      null,
      'Northwind MX',
    ]);
    expect(result.total).toBe(3);
  });
});
