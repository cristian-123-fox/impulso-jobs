import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import {
  AdminCompaniesUseCase,
  CreateCompanyCommand,
} from '@/modules/companies/use-cases/admin-companies.use-case';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const command = (): CreateCompanyCommand => ({
  businessName: 'Northwind',
  legalName: 'Northwind SA de CV',
  rfc: 'nor160101ab2',
  taxRegime: '601',
  postalCode: '45010',
  state: 'JAL',
  municipality: 'Zapopan',
  actorUserId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'jest',
});

const withOwner = (): CreateCompanyCommand => ({
  ...command(),
  owner: { email: 'Dueno@Test.io', password: 'Secreta#123' },
});

describe('AdminCompaniesUseCase', () => {
  let companies: jest.Mocked<ICompanyRepository>;
  let companyUsers: jest.Mocked<ICompanyUserRepository>;
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: AdminCompaniesUseCase;

  beforeEach(() => {
    companies = {
      existsByRfc: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn((c: Company) =>
        Promise.resolve(
          Object.assign(c, { id: 'company-1', createdAt: new Date() }),
        ),
      ),
    };
    companyUsers = {
      findByUserId: jest.fn(),
      findByUserIds: jest.fn().mockResolvedValue([]),
      findByCompanyIds: jest.fn().mockResolvedValue([]),
      save: jest.fn((m) => Promise.resolve(m)),
    };
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
      save: jest.fn((u: User) =>
        Promise.resolve(
          Object.assign(u, { id: 'user-1', createdAt: new Date() }),
        ),
      ),
    } as unknown as jest.Mocked<IUserRepository>;
    userRoles = {
      findRoleIdsByUserId: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    roles = {
      findByCode: jest
        .fn()
        .mockResolvedValue(Object.assign(new Role(), { id: 'role-employer' })),
    } as unknown as jest.Mocked<IRoleRepository>;
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
    } as unknown as jest.Mocked<PasswordHasherService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new AdminCompaniesUseCase(
      companies,
      companyUsers,
      users,
      userRoles,
      roles,
      hasher,
      audit,
      dataSource,
    );
  });

  it('crea la empresa normalizando el RFC a mayúsculas', async () => {
    const result = await useCase.create(command());

    expect(companies.existsByRfc).toHaveBeenCalledWith('NOR160101AB2');
    expect(result.company.rfc).toBe('NOR160101AB2');
    expect(result.ownerUserId).toBeNull();
    expect(users.save).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'companies.create' }),
      expect.anything(),
    );
  });

  it('crea la cuenta dueña verificada y la vincula como OWNER', async () => {
    const result = await useCase.create(withOwner());

    expect(result.ownerUserId).toBe('user-1');
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'dueno@test.io',
        role: PlatformRole.EMPLOYER,
        emailVerifiedAt: expect.any(Date),
      }),
      expect.anything(),
    );
    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-employer',
      expect.anything(),
    );
    expect(companyUsers.save).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        role: CompanyMemberRole.OWNER,
      }),
      expect.anything(),
    );
  });

  it('rechaza RFC duplicado', async () => {
    companies.existsByRfc.mockResolvedValue(true);

    const thrown = await useCase.create(command()).catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_RFC_ALREADY_EXISTS);
    expect(companies.save).not.toHaveBeenCalled();
  });

  it('rechaza el alta si el correo del dueño ya existe', async () => {
    users.findByEmail.mockResolvedValue(new User());

    const thrown = await useCase.create(withOwner()).catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    expect(companies.save).not.toHaveBeenCalled();
  });

  it('lista resolviendo dueño y número de miembros', async () => {
    const company = Object.assign(new Company(), {
      id: 'company-1',
      businessName: 'Northwind',
      legalName: 'Northwind SA de CV',
      rfc: 'NOR160101AB2',
      taxRegime: '601',
      postalCode: '45010',
      country: 'MX',
      state: 'JAL',
      municipality: 'Zapopan',
      createdAt: new Date(),
    });
    companies.findAndCount.mockResolvedValue([[company], 1]);
    companyUsers.findByCompanyIds.mockResolvedValue([
      Object.assign(new CompanyUser(), {
        companyId: 'company-1',
        userId: 'user-1',
        role: CompanyMemberRole.OWNER,
      }),
      Object.assign(new CompanyUser(), {
        companyId: 'company-1',
        userId: 'user-2',
        role: CompanyMemberRole.ADMIN,
      }),
    ]);
    users.findByIds.mockResolvedValue([
      Object.assign(new User(), { id: 'user-1', email: 'dueno@test.io' }),
    ]);

    const result = await useCase.list({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      ownerEmail: 'dueno@test.io',
      memberCount: 2,
    });
  });

  it('devuelve 404 al consultar una empresa inexistente', async () => {
    companies.findById.mockResolvedValue(null);

    const thrown = await useCase.get('missing').catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_NOT_FOUND);
  });
});
