import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
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

function membership(overrides: Partial<CompanyUser> = {}): CompanyUser {
  return Object.assign(new CompanyUser(), {
    id: 'member-1',
    companyId: 'company-1',
    userId: 'user-1',
    role: CompanyMemberRole.ADMIN,
    createdAt: new Date(),
    ...overrides,
  });
}

function employer(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'persona@empresa.test',
    role: PlatformRole.EMPLOYER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  });
}

const actor = { actorUserId: 'admin-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('CompanyMembersUseCase', () => {
  let companies: jest.Mocked<ICompanyRepository>;
  let members: jest.Mocked<ICompanyUserRepository>;
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: CompanyMembersUseCase;

  beforeEach(() => {
    companies = {
      findById: jest
        .fn()
        .mockResolvedValue(Object.assign(new Company(), { id: 'company-1' })),
    } as unknown as jest.Mocked<ICompanyRepository>;
    members = {
      findByUserId: jest.fn().mockResolvedValue(null),
      findByUserIds: jest.fn().mockResolvedValue([]),
      findByCompanyIds: jest.fn().mockResolvedValue([]),
      findByCompanyId: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      countByRole: jest.fn().mockResolvedValue(2),
      save: jest.fn((m: CompanyUser) =>
        Promise.resolve(
          Object.assign(m, { id: m.id || 'member-new', createdAt: new Date() }),
        ),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    users = {
      findById: jest.fn().mockResolvedValue(employer()),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
      save: jest.fn((u: User) =>
        Promise.resolve(
          Object.assign(u, { id: 'user-new', createdAt: new Date() }),
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

    useCase = new CompanyMembersUseCase(
      companies,
      members,
      users,
      userRoles,
      roles,
      hasher,
      audit,
      dataSource,
    );
  });

  describe('list', () => {
    it('ordena el equipo del rol más alto al más bajo', async () => {
      members.findByCompanyId.mockResolvedValue([
        membership({
          id: 'm1',
          userId: 'u-member',
          role: CompanyMemberRole.MEMBER,
        }),
        membership({
          id: 'm2',
          userId: 'u-owner',
          role: CompanyMemberRole.OWNER,
        }),
        membership({
          id: 'm3',
          userId: 'u-recruiter',
          role: CompanyMemberRole.RECRUITER,
        }),
      ]);
      users.findByIds.mockResolvedValue([
        employer({ id: 'u-member', email: 'member@test.io' }),
        employer({ id: 'u-owner', email: 'owner@test.io' }),
        employer({ id: 'u-recruiter', email: 'recruiter@test.io' }),
      ]);

      const result = await useCase.list('company-1');

      expect(result.map((m) => m.companyRole)).toEqual([
        CompanyMemberRole.OWNER,
        CompanyMemberRole.RECRUITER,
        CompanyMemberRole.MEMBER,
      ]);
    });

    it('devuelve 404 si la empresa no existe', async () => {
      companies.findById.mockResolvedValue(null);

      const thrown = await useCase.list('missing').catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_NOT_FOUND);
    });
  });

  describe('add', () => {
    it('vincula una cuenta EMPLOYER existente sin crear usuario', async () => {
      const result = await useCase.add({
        ...actor,
        companyId: 'company-1',
        userId: 'user-1',
        role: CompanyMemberRole.RECRUITER,
      });

      expect(result).toMatchObject({
        userId: 'user-1',
        companyRole: CompanyMemberRole.RECRUITER,
      });
      expect(users.save).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company_users.add' }),
        expect.anything(),
      );
    });

    it('crea la cuenta EMPLOYER verificada cuando se dan correo y contraseña', async () => {
      const result = await useCase.add({
        ...actor,
        companyId: 'company-1',
        email: 'Nuevo@Empresa.test',
        password: 'Secreta#123',
        role: CompanyMemberRole.ADMIN,
      });

      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@empresa.test',
          role: PlatformRole.EMPLOYER,
          emailVerifiedAt: expect.any(Date),
        }),
        expect.anything(),
      );
      expect(userRoles.add).toHaveBeenCalledWith(
        'user-new',
        'role-employer',
        expect.anything(),
      );
      expect(result.companyRole).toBe(CompanyMemberRole.ADMIN);
    });

    it('rechaza vincular una cuenta que no es de empresa', async () => {
      users.findById.mockResolvedValue(
        employer({ role: PlatformRole.CANDIDATE }),
      );

      const thrown = await useCase
        .add({
          ...actor,
          companyId: 'company-1',
          userId: 'user-1',
          role: CompanyMemberRole.MEMBER,
        })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(
        ErrorCode.COMPANY_MEMBER_INVALID_ACCOUNT,
      );
      expect(members.save).not.toHaveBeenCalled();
    });

    it('rechaza a quien ya pertenece a otra empresa', async () => {
      members.findByUserId.mockResolvedValue(
        membership({ companyId: 'otra-empresa' }),
      );

      const thrown = await useCase
        .add({
          ...actor,
          companyId: 'company-1',
          userId: 'user-1',
          role: CompanyMemberRole.MEMBER,
        })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(
        ErrorCode.COMPANY_MEMBER_IN_OTHER_COMPANY,
      );
    });

    it('rechaza a quien ya está en el equipo', async () => {
      members.findByUserId.mockResolvedValue(membership());

      const thrown = await useCase
        .add({
          ...actor,
          companyId: 'company-1',
          userId: 'user-1',
          role: CompanyMemberRole.MEMBER,
        })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_MEMBER_ALREADY_EXISTS);
    });

    it('rechaza crear una cuenta con un correo ya usado', async () => {
      users.findByEmail.mockResolvedValue(employer());

      const thrown = await useCase
        .add({
          ...actor,
          companyId: 'company-1',
          email: 'ocupado@test.io',
          password: 'Secreta#123',
          role: CompanyMemberRole.MEMBER,
        })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('cambia el rol interno de un miembro', async () => {
      members.findOne.mockResolvedValue(membership());

      const result = await useCase.updateRole({
        ...actor,
        companyId: 'company-1',
        userId: 'user-1',
        role: CompanyMemberRole.RECRUITER,
      });

      expect(result.companyRole).toBe(CompanyMemberRole.RECRUITER);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company_users.update' }),
        expect.anything(),
      );
    });

    it('impide degradar al único propietario', async () => {
      members.findOne.mockResolvedValue(
        membership({ role: CompanyMemberRole.OWNER }),
      );
      members.countByRole.mockResolvedValue(1);

      const thrown = await useCase
        .updateRole({
          ...actor,
          companyId: 'company-1',
          userId: 'user-1',
          role: CompanyMemberRole.ADMIN,
        })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_LAST_OWNER);
      expect(members.save).not.toHaveBeenCalled();
    });

    it('permite degradar a un propietario si queda otro', async () => {
      members.findOne.mockResolvedValue(
        membership({ role: CompanyMemberRole.OWNER }),
      );
      members.countByRole.mockResolvedValue(2);

      const result = await useCase.updateRole({
        ...actor,
        companyId: 'company-1',
        userId: 'user-1',
        role: CompanyMemberRole.ADMIN,
      });

      expect(result.companyRole).toBe(CompanyMemberRole.ADMIN);
    });
  });

  describe('remove', () => {
    it('retira al miembro del equipo', async () => {
      members.findOne.mockResolvedValue(membership());

      await useCase.remove({
        ...actor,
        companyId: 'company-1',
        userId: 'user-1',
      });

      expect(members.remove).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        expect.anything(),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company_users.remove' }),
        expect.anything(),
      );
    });

    it('impide quitar al único propietario', async () => {
      members.findOne.mockResolvedValue(
        membership({ role: CompanyMemberRole.OWNER }),
      );
      members.countByRole.mockResolvedValue(1);

      const thrown = await useCase
        .remove({ ...actor, companyId: 'company-1', userId: 'user-1' })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_LAST_OWNER);
      expect(members.remove).not.toHaveBeenCalled();
    });

    it('devuelve 404 si el usuario no es del equipo', async () => {
      members.findOne.mockResolvedValue(null);

      const thrown = await useCase
        .remove({ ...actor, companyId: 'company-1', userId: 'ajeno' })
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.COMPANY_MEMBER_NOT_FOUND);
    });
  });
});
