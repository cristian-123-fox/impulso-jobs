import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { IRolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { DeleteRoleUseCase } from '@/modules/iam/roles/use-cases/delete-role.use-case';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';

function roleOf(overrides: Partial<Role> = {}): Role {
  return Object.assign(new Role(), {
    id: 'role-1',
    code: 'CONTENT_MANAGER',
    name: 'Gestor de contenidos',
    description: null,
    isSystem: false,
    ...overrides,
  });
}

describe('DeleteRoleUseCase', () => {
  let roles: jest.Mocked<IRoleRepository>;
  let rolePermissions: jest.Mocked<IRolePermissionRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: DeleteRoleUseCase;

  const command = {
    id: 'role-1',
    actorUserId: 'admin-1',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    roles = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByIds: jest.fn(),
      existsByCode: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    rolePermissions = {
      findRolePermissionCodes: jest.fn(),
      findPermissionIdsByRoleId: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      removeByRoleId: jest.fn(),
    };
    userRoles = {
      findRoleIdsByUserId: jest.fn(),
      findByUserIds: jest.fn(),
      exists: jest.fn(),
      countByRoleId: jest.fn().mockResolvedValue(0),
      add: jest.fn(),
      remove: jest.fn(),
    };
    permissionsService = {
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<PermissionsService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    // `runInTransaction` sólo necesita un manager que se pase a los repos.
    const dataSource = {
      transaction: (work: (manager: unknown) => Promise<unknown>) => work({}),
    } as unknown as DataSource;

    useCase = new DeleteRoleUseCase(
      roles,
      rolePermissions,
      userRoles,
      permissionsService,
      audit,
      dataSource,
    );
  });

  it('borra el rol con sus permisos e invalida la caché del guard', async () => {
    roles.findById.mockResolvedValue(roleOf());

    await useCase.execute(command);

    expect(rolePermissions.removeByRoleId).toHaveBeenCalledWith(
      'role-1',
      expect.anything(),
    );
    expect(roles.remove).toHaveBeenCalledWith('role-1', expect.anything());
    expect(permissionsService.invalidate).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'roles.delete' }),
    );
  });

  it('rechaza con 404 si el rol no existe', async () => {
    roles.findById.mockResolvedValue(null);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).getStatus()).toBe(404);
    expect(roles.remove).not.toHaveBeenCalled();
  });

  it('rechaza con 409 un rol de sistema', async () => {
    roles.findById.mockResolvedValue(roleOf({ isSystem: true, code: 'ADMIN' }));

    const thrown = await useCase.execute(command).catch((e: unknown) => e);

    expect((thrown as AppException).getStatus()).toBe(409);
    expect((thrown as AppException).getResponse()).toMatchObject({
      errorCode: ErrorCode.ROLE_IMMUTABLE,
    });
    expect(roles.remove).not.toHaveBeenCalled();
  });

  it('rechaza con 409 un rol asignado a alguna cuenta', async () => {
    roles.findById.mockResolvedValue(roleOf());
    userRoles.countByRoleId.mockResolvedValue(3);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);

    expect((thrown as AppException).getStatus()).toBe(409);
    expect((thrown as AppException).getResponse()).toMatchObject({
      errorCode: ErrorCode.ROLE_IN_USE,
    });
    expect(rolePermissions.removeByRoleId).not.toHaveBeenCalled();
    expect(roles.remove).not.toHaveBeenCalled();
  });
});
