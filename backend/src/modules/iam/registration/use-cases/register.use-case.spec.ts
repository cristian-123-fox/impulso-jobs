import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { RequestEmailVerificationUseCase } from '@/modules/iam/auth/use-cases/request-email-verification.use-case';
import {
  RegisterCommand,
  RegisterUseCase,
} from '@/modules/iam/registration/use-cases/register.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const companyCommand = (): RegisterCommand => ({
  accountType: 'company',
  email: 'empresa@test.io',
  password: 'Secreta#123',
  company: {
    businessName: 'Impulso Talent',
    legalName: 'Impulso Talent SA de CV',
    rfc: 'ITA160101AB2',
    taxRegime: '601',
    postalCode: '44100',
    state: 'JAL',
    municipality: 'Guadalajara',
  },
  ip: '127.0.0.1',
  userAgent: 'jest',
});

const candidateCommand = (): RegisterCommand => ({
  accountType: 'candidate',
  email: 'ana@test.io',
  password: 'Secreta#123',
  candidate: {
    firstName: 'Ana',
    lastName: 'García',
    documentType: DocumentType.CURP,
    documentNumber: 'GARA900520MJCXXX09',
    curp: 'GARA900520MJCXXX09',
    birthDate: '1990-05-20',
    state: 'JAL',
    municipality: 'Zapopan',
  },
  ip: '127.0.0.1',
  userAgent: 'jest',
});

describe('RegisterUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let companyUsers: jest.Mocked<ICompanyUserRepository>;
  let candidates: jest.Mocked<ICandidateProfileRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let requestVerification: jest.Mocked<RequestEmailVerificationUseCase>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      save: jest.fn((u: User) =>
        Promise.resolve(Object.assign(u, { id: u.id || 'user-1' })),
      ),
    };
    userRoles = {
      findRoleIdsByUserId: jest.fn(),
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
      existsByRfc: jest.fn().mockResolvedValue(false),
      save: jest.fn((c: Company) =>
        Promise.resolve(Object.assign(c, { id: 'company-1' })),
      ),
    };
    companyUsers = { save: jest.fn((m) => Promise.resolve(m)) };
    candidates = {
      existsByDocumentNumber: jest.fn().mockResolvedValue(false),
      save: jest.fn((p) => Promise.resolve(p)),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
    } as unknown as jest.Mocked<PasswordHasherService>;
    requestVerification = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RequestEmailVerificationUseCase>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new RegisterUseCase(
      users,
      userRoles,
      roles,
      companies,
      companyUsers,
      candidates,
      hasher,
      requestVerification,
      audit,
      dataSource,
    );
  });

  it('registra una empresa (user + company + OWNER + rol + verificación)', async () => {
    const result = await useCase.execute(companyCommand());

    expect(result).toMatchObject({
      accountType: 'company',
      verificationRequired: true,
    });
    expect(roles.findByCode).toHaveBeenCalledWith('EMPLOYER');
    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-1',
      expect.anything(),
    );
    expect(companies.save).toHaveBeenCalled();
    expect(companyUsers.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: CompanyMemberRole.OWNER }),
      expect.anything(),
    );
    expect(requestVerification.execute).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'empresa@test.io' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.register' }),
      expect.anything(),
    );
  });

  it('registra un candidato (user + profile + rol + verificación)', async () => {
    const result = await useCase.execute(candidateCommand());

    expect(result.accountType).toBe('candidate');
    expect(roles.findByCode).toHaveBeenCalledWith('CANDIDATE');
    expect(candidates.save).toHaveBeenCalled();
    expect(requestVerification.execute).toHaveBeenCalledTimes(1);
  });

  it('normaliza el RFC a mayúsculas al verificar duplicados y guardar', async () => {
    const command = companyCommand();
    command.company!.rfc = 'ita160101ab2';
    await useCase.execute(command);

    expect(companies.existsByRfc).toHaveBeenCalledWith('ITA160101AB2');
    expect(companies.save).toHaveBeenCalledWith(
      expect.objectContaining({ rfc: 'ITA160101AB2' }),
      expect.anything(),
    );
  });

  it('rechaza correo duplicado', async () => {
    users.findByEmail.mockResolvedValue(new User());
    const thrown = await useCase
      .execute(companyCommand())
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza RFC duplicado', async () => {
    companies.existsByRfc.mockResolvedValue(true);
    const thrown = await useCase
      .execute(companyCommand())
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_RFC_ALREADY_EXISTS);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza document_number duplicado', async () => {
    candidates.existsByDocumentNumber.mockResolvedValue(true);
    const thrown = await useCase
      .execute(candidateCommand())
      .catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(
      ErrorCode.CANDIDATE_DOCUMENT_ALREADY_EXISTS,
    );
  });

  it('rechaza fecha de nacimiento futura', async () => {
    const command = candidateCommand();
    command.candidate!.birthDate = '2999-01-01';
    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.INVALID_BIRTH_DATE);
    expect(candidates.save).not.toHaveBeenCalled();
  });

  it('NO dispara verificación si algo falla dentro de la transacción (rollback)', async () => {
    candidates.save.mockRejectedValue(new Error('db down'));
    const thrown = await useCase
      .execute(candidateCommand())
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(Error);
    // La verificación va después del commit: no debe ejecutarse si hubo rollback.
    expect(requestVerification.execute).not.toHaveBeenCalled();
  });
});
