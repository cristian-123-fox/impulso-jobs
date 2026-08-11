import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';
import { UpdateUserUseCase } from '@/modules/iam/users/use-cases/update-user.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function existingUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'persona@test.io',
    passwordHash: 'old-hash',
    role: PlatformRole.CANDIDATE,
    status: UserStatus.ACTIVE,
    failedAttempts: 0,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  });
}

describe('UpdateUserUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let profiles: jest.Mocked<UserProfileResolver>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: UpdateUserUseCase;

  const command = {
    id: 'user-1',
    actorUserId: 'admin-1',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(existingUser()),
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<IUserRepository>;
    userRoles = {
      findRoleIdsByUserId: jest.fn(),
      countByRoleId: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    roles = {
      findByCode: jest.fn((code: string) =>
        Promise.resolve(Object.assign(new Role(), { id: `role-${code}` })),
      ),
    } as unknown as jest.Mocked<IRoleRepository>;
    hasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
    } as unknown as jest.Mocked<PasswordHasherService>;
    profiles = {
      resolveOne: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<UserProfileResolver>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new UpdateUserUseCase(
      users,
      userRoles,
      roles,
      hasher,
      profiles,
      audit,
      dataSource,
    );
  });

  it('cambia el rol sincronizando user_roles', async () => {
    const result = await useCase.execute({
      ...command,
      role: PlatformRole.EMPLOYER,
    });

    expect(result.role).toBe(PlatformRole.EMPLOYER);
    expect(userRoles.remove).toHaveBeenCalledWith(
      'user-1',
      'role-CANDIDATE',
      expect.anything(),
    );
    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-EMPLOYER',
      expect.anything(),
    );
  });

  it('al restablecer la contraseña invalida las sesiones vigentes', async () => {
    await useCase.execute({ ...command, password: 'Otra#12345' });

    expect(hasher.hash).toHaveBeenCalledWith('Otra#12345');
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'new-hash',
        tokensValidFrom: expect.any(Date),
      }),
      expect.anything(),
    );
  });

  it('reactivar limpia el bloqueo temporal por intentos fallidos', async () => {
    users.findById.mockResolvedValue(
      existingUser({
        status: UserStatus.INACTIVE,
        failedAttempts: 3,
        blockedUntil: new Date(Date.now() + 60_000),
      }),
    );

    const result = await useCase.execute({
      ...command,
      status: UserStatus.ACTIVE,
    });

    expect(result.status).toBe(UserStatus.ACTIVE);
    expect(result.temporarilyBlocked).toBe(false);
    expect(result.blockedUntil).toBeNull();
  });

  it('impide que el administrador se desactive a sí mismo', async () => {
    users.findById.mockResolvedValue(existingUser({ id: 'admin-1' }));

    const thrown = await useCase
      .execute({ ...command, id: 'admin-1', status: UserStatus.INACTIVE })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CONFLICT);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza un correo ya usado por otra cuenta', async () => {
    users.findByEmail.mockResolvedValue(existingUser({ id: 'otro' }));

    const thrown = await useCase
      .execute({ ...command, email: 'ocupado@test.io' })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('devuelve 404 si la cuenta no existe', async () => {
    users.findById.mockResolvedValue(null);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.USER_NOT_FOUND);
  });
});
