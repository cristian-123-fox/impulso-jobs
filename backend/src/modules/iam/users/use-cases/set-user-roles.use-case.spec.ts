import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';
import { SetUserRolesUseCase } from '@/modules/iam/users/use-cases/set-user-roles.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function role(id: string, code: string, isSystem = false): Role {
  return Object.assign(new Role(), { id, code, name: code, isSystem });
}

const ADMIN_ROLE = role('role-admin', 'ADMIN', true);
const SUPPORT_ROLE = role('role-support', 'SOPORTE');
const CONTENT_ROLE = role('role-content', 'CONTENIDOS');

const command = {
  userId: 'user-1',
  actorUserId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'jest',
};

describe('SetUserRolesUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let profiles: jest.Mocked<UserProfileResolver>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: SetUserRolesUseCase;

  /** Catálogo de roles conocido por el repositorio simulado. */
  const catalog = [ADMIN_ROLE, SUPPORT_ROLE, CONTENT_ROLE];

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(
        Object.assign(new User(), {
          id: 'user-1',
          email: 'staff@impulso.test',
          role: PlatformRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
        }),
      ),
      save: jest.fn((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<IUserRepository>;
    userRoles = {
      findRoleIdsByUserId: jest.fn().mockResolvedValue(['role-admin']),
      findByUserIds: jest.fn().mockResolvedValue([]),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    roles = {
      findByIds: jest.fn((ids: string[]) =>
        Promise.resolve(catalog.filter((r) => ids.includes(r.id))),
      ),
    } as unknown as jest.Mocked<IRoleRepository>;
    profiles = {
      resolveOne: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<UserProfileResolver>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new SetUserRolesUseCase(
      users,
      userRoles,
      roles,
      profiles,
      audit,
      dataSource,
    );
  });

  it('asigna un rol adicional conservando el rol base', async () => {
    await useCase.execute({ ...command, roleIds: ['role-support'] });

    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-support',
      expect.anything(),
    );
    expect(userRoles.remove).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'roles.assign' }),
      expect.anything(),
    );
  });

  it('sincroniza el conjunto: agrega los nuevos y quita los que sobran', async () => {
    userRoles.findRoleIdsByUserId.mockResolvedValue([
      'role-admin',
      'role-support',
    ]);

    await useCase.execute({ ...command, roleIds: ['role-content'] });

    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-content',
      expect.anything(),
    );
    expect(userRoles.remove).toHaveBeenCalledWith(
      'user-1',
      'role-support',
      expect.anything(),
    );
    // El rol base nunca se toca desde aquí.
    expect(userRoles.remove).not.toHaveBeenCalledWith(
      'user-1',
      'role-admin',
      expect.anything(),
    );
  });

  it('invalida las sesiones vigentes al cambiar los permisos', async () => {
    await useCase.execute({ ...command, roleIds: ['role-support'] });

    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ tokensValidFrom: expect.any(Date) }),
      expect.anything(),
    );
  });

  it('no toca nada si el conjunto no cambia', async () => {
    userRoles.findRoleIdsByUserId.mockResolvedValue([
      'role-admin',
      'role-support',
    ]);

    await useCase.execute({ ...command, roleIds: ['role-support'] });

    expect(userRoles.add).not.toHaveBeenCalled();
    expect(userRoles.remove).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza asignar un rol base como adicional', async () => {
    const thrown = await useCase
      .execute({ ...command, roleIds: ['role-admin'] })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.ROLE_IMMUTABLE);
    expect(userRoles.add).not.toHaveBeenCalled();
  });

  it('rechaza un rol inexistente', async () => {
    const thrown = await useCase
      .execute({ ...command, roleIds: ['role-fantasma'] })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.ROLE_NOT_FOUND);
  });

  it('devuelve 404 si la cuenta no existe', async () => {
    users.findById.mockResolvedValue(null);

    const thrown = await useCase
      .execute({ ...command, roleIds: [] })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.USER_NOT_FOUND);
  });

  it('quita todos los adicionales cuando se envía una lista vacía', async () => {
    userRoles.findRoleIdsByUserId.mockResolvedValue([
      'role-admin',
      'role-support',
      'role-content',
    ]);

    await useCase.execute({ ...command, roleIds: [] });

    expect(userRoles.remove).toHaveBeenCalledWith(
      'user-1',
      'role-support',
      expect.anything(),
    );
    expect(userRoles.remove).toHaveBeenCalledWith(
      'user-1',
      'role-content',
      expect.anything(),
    );
  });
});
