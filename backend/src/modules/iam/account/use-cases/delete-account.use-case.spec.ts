import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { hashPassword } from '@/common/utils/password.util';
import { AuditService } from '@/modules/audit/audit.service';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { DeleteAccountUseCase } from '@/modules/iam/account/use-cases/delete-account.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const PASSWORD = 'Candidato123!';

async function user(overrides: Partial<User> = {}): Promise<User> {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: await hashPassword(PASSWORD),
    role: Role.CANDIDATE,
    status: UserStatus.ACTIVE,
    ...overrides,
  });
}

function membership(role: CompanyMemberRole): CompanyUser {
  return Object.assign(new CompanyUser(), {
    id: 'member-1',
    companyId: 'company-1',
    userId: 'user-1',
    role,
  });
}

const base = { ip: '127.0.0.1', userAgent: 'jest', accessJti: 'jti-1' };

describe('DeleteAccountUseCase', () => {
  let dataSource: DataSource;
  let users: jest.Mocked<IUserRepository>;
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let members: jest.Mocked<ICompanyUserRepository>;
  let tokens: jest.Mocked<ITokenUserRepository>;
  let blacklist: jest.Mocked<IBlacklistTokenRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: DeleteAccountUseCase;
  let current: User;

  beforeEach(async () => {
    current = await user();

    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    users = {
      findById: jest.fn(() => Promise.resolve(current)),
      save: jest.fn((u: User) => Promise.resolve(u)),
      softDelete: jest.fn(),
      countBy: jest.fn().mockResolvedValue(3),
    } as unknown as jest.Mocked<IUserRepository>;

    profiles = {
      softDeleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;

    members = {
      findByUserId: jest.fn().mockResolvedValue(null),
      countByRole: jest.fn().mockResolvedValue(2),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ICompanyUserRepository>;

    tokens = {
      revokeAllByUserId: jest.fn(),
    } as unknown as jest.Mocked<ITokenUserRepository>;

    blacklist = {
      existsByJti: jest.fn().mockResolvedValue(false),
      add: jest.fn(),
    };

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new DeleteAccountUseCase(
      users,
      profiles,
      members,
      tokens,
      blacklist,
      audit,
      dataSource,
    );
  });

  it('da de baja la cuenta y el perfil, e invalida todas las sesiones', async () => {
    await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });

    expect(users.softDelete).toHaveBeenCalledWith('user-1', expect.anything());
    expect(profiles.softDeleteByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
    );
    // Las tres vías de invalidación de sesión.
    expect(current.tokensValidFrom).toBeInstanceOf(Date);
    expect(tokens.revokeAllByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
    );
    expect(blacklist.add).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'jti-1', reason: 'account.delete' }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'account.delete' }),
      expect.anything(),
    );
  });

  it('exige la contraseña correcta', async () => {
    try {
      await useCase.execute({
        userId: 'user-1',
        password: 'incorrecta',
        ...base,
      });
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    expect(users.softDelete).not.toHaveBeenCalled();
    expect(tokens.revokeAllByUserId).not.toHaveBeenCalled();
  });

  it('bloquea la baja del único administrador activo', async () => {
    current = await user({ role: Role.ADMIN });
    users.countBy.mockResolvedValue(1);

    try {
      await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.ACCOUNT_LAST_ADMIN);
    }
    expect(users.softDelete).not.toHaveBeenCalled();
  });

  it('permite la baja de un administrador si queda otro activo', async () => {
    current = await user({ role: Role.ADMIN });
    users.countBy.mockResolvedValue(2);

    await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });

    expect(users.softDelete).toHaveBeenCalled();
  });

  it('bloquea la baja del único titular de una empresa', async () => {
    members.findByUserId.mockResolvedValue(membership(CompanyMemberRole.OWNER));
    members.countByRole.mockResolvedValue(1);

    try {
      await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.COMPANY_LAST_OWNER);
    }
    expect(users.softDelete).not.toHaveBeenCalled();
  });

  it('deja salir del equipo a un miembro que no es el último titular', async () => {
    members.findByUserId.mockResolvedValue(
      membership(CompanyMemberRole.RECRUITER),
    );

    await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });

    expect(members.remove).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.anything(),
    );
    expect(users.softDelete).toHaveBeenCalled();
  });

  it('no vuelve a poner en blacklist un jti ya revocado', async () => {
    blacklist.existsByJti.mockResolvedValue(true);

    await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });

    expect(blacklist.add).not.toHaveBeenCalled();
  });

  it('todo ocurre dentro de una transacción', async () => {
    await useCase.execute({ userId: 'user-1', password: PASSWORD, ...base });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(users.softDelete.mock.calls[0][1]).toBeDefined();
  });
});
