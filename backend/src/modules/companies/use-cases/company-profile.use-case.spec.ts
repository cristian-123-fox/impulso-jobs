import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyProfileUseCase } from '@/modules/companies/use-cases/company-profile.use-case';

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function baseCommand(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    role: Role.EMPLOYER,
    ip: '127.0.0.1',
    userAgent: 'jest',
    businessName: 'Impulso Talent',
    legalName: 'Impulso Talent S.A. de C.V.',
    taxRegime: '601',
    postalCode: '44100',
    state: 'JAL',
    municipality: 'Guadalajara',
    ...overrides,
  } as Parameters<CompanyProfileUseCase['updateProfile']>[0];
}

describe('CompanyProfileUseCase', () => {
  let companies: jest.Mocked<ICompanyRepository>;
  let members: jest.Mocked<ICompanyUserRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CompanyProfileUseCase;

  const makeCompany = () =>
    Object.assign(new Company(), {
      id: 'company-1',
      businessName: 'Old Name',
      legalName: 'Old Legal',
      rfc: 'ITA160101AB2',
      taxRegime: '601',
      postalCode: '44100',
      country: 'MX',
      state: 'JAL',
      municipality: 'Guadalajara',
    });

  beforeEach(() => {
    companies = {
      existsByRfc: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeCompany()),
      save: jest.fn((c: Company) => Promise.resolve(c)),
    };
    members = {
      findByUserId: jest.fn().mockResolvedValue(
        Object.assign(new CompanyUser(), {
          id: 'cu-1',
          companyId: 'company-1',
          userId: 'user-1',
          role: CompanyMemberRole.OWNER,
        }),
      ),
      save: jest.fn(),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    useCase = new CompanyProfileUseCase(companies, members, audit);
  });

  it('rechaza a un usuario que no es empresa (EMPLOYER)', async () => {
    const thrown = await useCase
      .getProfile('user-1', Role.CANDIDATE)
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.FORBIDDEN);
  });

  it('no permite acceder a una empresa ajena: sin membresía -> COMPANY_NOT_FOUND', async () => {
    members.findByUserId.mockResolvedValue(null);
    const thrown = await useCase
      .getProfile('intruso', Role.EMPLOYER)
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_NOT_FOUND);
    expect(companies.findById).not.toHaveBeenCalled();
  });

  it('rechaza el cambio de RFC (inmutable)', async () => {
    const thrown = await useCase
      .updateProfile(baseCommand({ rfc: 'XXX010101XXX' }))
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_RFC_IMMUTABLE);
    expect(companies.save).not.toHaveBeenCalled();
  });

  it('acepta la actualización cuando el RFC coincide (o se omite) y audita', async () => {
    const result = await useCase.updateProfile(
      baseCommand({
        rfc: 'ita160101ab2', // mismo RFC en minúsculas -> normaliza y coincide
        businessName: 'Nuevo Nombre',
        cfdiUse: 'G03',
        phoneNumber: '33 1234 5678',
        foundationYear: 2016,
      }),
    );

    expect(result.company.businessName).toBe('Nuevo Nombre');
    expect(result.company.rfc).toBe('ITA160101AB2'); // inalterado
    expect(result.company.cfdiUse).toBe('G03');
    expect(result.company.phoneNumber).toBe('+523312345678'); // normalizado
    expect(result.companyRole).toBe(CompanyMemberRole.OWNER);
    expect(companies.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company.profile.update',
        entity: 'company',
        entityId: 'company-1',
      }),
    );
  });

  it('rechaza un año de fundación mayor al actual', async () => {
    const nextYear = new Date().getFullYear() + 1;
    const thrown = await useCase
      .updateProfile(baseCommand({ foundationYear: nextYear }))
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_INVALID_FOUNDATION_YEAR);
  });

  it('rechaza un teléfono inválido', async () => {
    const thrown = await useCase
      .updateProfile(baseCommand({ phoneNumber: '12345' }))
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_INVALID_PHONE);
  });

  it('actualiza el logo y audita', async () => {
    const saved = await useCase.updateLogo({
      userId: 'user-1',
      role: Role.EMPLOYER,
      ip: '127.0.0.1',
      userAgent: 'jest',
      logoUrl: 'https://cdn.impulso.jobs/logo.png',
    });
    expect(saved.logoUrl).toBe('https://cdn.impulso.jobs/logo.png');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'company.profile.logo.update' }),
    );
  });
});
