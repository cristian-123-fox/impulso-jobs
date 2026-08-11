import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  CreateUserCommand,
  CreateUserUseCase,
} from '@/modules/iam/users/use-cases/create-user.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const base = {
  email: 'nuevo@test.io',
  password: 'Secreta#123',
  actorUserId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'jest',
};

const adminCommand = (): CreateUserCommand => ({
  ...base,
  role: PlatformRole.ADMIN,
});

const employerCommand = (): CreateUserCommand => ({
  ...base,
  role: PlatformRole.EMPLOYER,
  companyId: 'company-1',
});

const candidateCommand = (): CreateUserCommand => ({
  ...base,
  role: PlatformRole.CANDIDATE,
  candidate: {
    firstName: 'Ana',
    lastName: 'García',
    documentType: DocumentType.CURP,
    documentNumber: 'GARA900520MJCXXX09',
    birthDate: '1990-05-20',
    state: 'JAL',
    municipality: 'Zapopan',
  },
});

describe('CreateUserUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let companyUsers: jest.Mocked<ICompanyUserRepository>;
  let candidates: jest.Mocked<ICandidateProfileRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn((u: User) =>
        Promise.resolve(
          Object.assign(u, { id: u.id || 'user-1', createdAt: new Date() }),
        ),
      ),
    } as unknown as jest.Mocked<IUserRepository>;
    userRoles = {
      findRoleIdsByUserId: jest.fn(),
      countByRoleId: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    roles = {
      findByCode: jest
        .fn()
        .mockResolvedValue(Object.assign(new Role(), { id: 'role-1' })),
    } as unknown as jest.Mocked<IRoleRepository>;
    companies = {
      findById: jest.fn().mockResolvedValue(
        Object.assign(new Company(), {
          id: 'company-1',
          businessName: 'Northwind',
        }),
      ),
    } as unknown as jest.Mocked<ICompanyRepository>;
    companyUsers = {
      save: jest.fn((m) => Promise.resolve(m)),
    } as unknown as jest.Mocked<ICompanyUserRepository>;
    candidates = {
      existsByDocumentNumber: jest.fn().mockResolvedValue(false),
      save: jest.fn((p) => Promise.resolve(p)),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
    } as unknown as jest.Mocked<PasswordHasherService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new CreateUserUseCase(
      users,
      userRoles,
      roles,
      companies,
      companyUsers,
      candidates,
      hasher,
      audit,
      dataSource,
    );
  });

  it('crea la cuenta verificada y activa por defecto', async () => {
    const result = await useCase.execute(adminCommand());

    expect(result).toMatchObject({
      email: 'nuevo@test.io',
      role: PlatformRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-1',
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'users.create' }),
      expect.anything(),
    );
  });

  it('respeta emailVerified=false cuando se pide explícitamente', async () => {
    const result = await useCase.execute({
      ...adminCommand(),
      emailVerified: false,
    });

    expect(result.emailVerified).toBe(false);
  });

  it('vincula al empleador con su empresa (ADMIN interno por defecto)', async () => {
    const result = await useCase.execute(employerCommand());

    expect(companyUsers.save).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        role: CompanyMemberRole.ADMIN,
      }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      companyId: 'company-1',
      companyName: 'Northwind',
      companyRole: CompanyMemberRole.ADMIN,
    });
  });

  it('rechaza un empleador cuya empresa no existe', async () => {
    companies.findById.mockResolvedValue(null);

    const thrown = await useCase
      .execute(employerCommand())
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_NOT_FOUND);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('crea el perfil del candidato', async () => {
    await useCase.execute(candidateCommand());

    expect(candidates.save).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ana', lastName: 'García' }),
      expect.anything(),
    );
  });

  it('rechaza documento de candidato duplicado', async () => {
    candidates.existsByDocumentNumber.mockResolvedValue(true);

    const thrown = await useCase
      .execute(candidateCommand())
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(
      ErrorCode.CANDIDATE_DOCUMENT_ALREADY_EXISTS,
    );
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza correo duplicado', async () => {
    users.findByEmail.mockResolvedValue(new User());

    const thrown = await useCase
      .execute(adminCommand())
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    expect(users.save).not.toHaveBeenCalled();
  });
});
