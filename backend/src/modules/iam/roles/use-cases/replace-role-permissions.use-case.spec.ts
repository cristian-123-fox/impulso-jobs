import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { RoleScope } from '@/common/types/role-scope.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { IPermissionRepository } from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { IRolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { ReplaceRolePermissionsUseCase } from '@/modules/iam/roles/use-cases/replace-role-permissions.use-case';

function permissionOf(id: string, code: string): Permission {
  return Object.assign(new Permission(), {
    id,
    code,
    componentId: 'c',
    actionId: 'a',
    description: null,
  });
}

function roleOf(overrides: Partial<Role> = {}): Role {
  return Object.assign(new Role(), {
    id: 'role-1',
    code: 'SOPORTE',
    name: 'Soporte',
    description: null,
    isSystem: false,
    scope: RoleScope.PLATFORM,
    ...overrides,
  });
}

// Catálogo mínimo con un permiso de cada tipo que interviene en las reglas.
const CATALOG: Permission[] = [
  permissionOf('p-users-read', 'users.read'),
  permissionOf('p-users-delete', 'users.delete'),
  permissionOf('p-vacancies-create', 'vacancies.create'),
  permissionOf('p-promotions-create', 'promotions.create'),
  permissionOf('p-catalogs-read', 'catalogs.read'),
  permissionOf('p-permissions-assign', 'permissions.assign'),
];

describe('ReplaceRolePermissionsUseCase', () => {
  let roles: jest.Mocked<IRoleRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;
  let rolePermissions: jest.Mocked<IRolePermissionRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: ReplaceRolePermissionsUseCase;

  const base = { actorUserId: 'admin-1', ip: '127.0.0.1', userAgent: 'jest' };

  beforeEach(() => {
    roles = {
      findAll: jest.fn(),
      findByCompanyId: jest.fn(),
      findById: jest.fn().mockResolvedValue(roleOf()),
      findByCode: jest.fn(),
      findByIds: jest.fn(),
      existsByCode: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    permissions = {
      findAll: jest.fn().mockResolvedValue(CATALOG),
      findById: jest.fn(),
      findByIds: jest.fn(),
    };
    rolePermissions = {
      findRolePermissionCodes: jest.fn(),
      findPermissionIdsByRoleId: jest.fn().mockResolvedValue(['p-users-read']),
      countByRole: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      addMany: jest.fn(),
      remove: jest.fn(),
      removeMany: jest.fn(),
      removeByRoleId: jest.fn(),
    };
    permissionsService = {
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<PermissionsService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    const dataSource = {
      transaction: (work: (manager: unknown) => Promise<unknown>) => work({}),
    } as unknown as DataSource;

    useCase = new ReplaceRolePermissionsUseCase(
      roles,
      permissions,
      rolePermissions,
      permissionsService,
      audit,
      dataSource,
    );
  });

  it('aplica altas y bajas en una transacción e invalida la caché', async () => {
    await useCase.execute({
      ...base,
      roleId: 'role-1',
      permissionIds: ['p-users-delete'],
    });

    expect(rolePermissions.addMany).toHaveBeenCalledWith(
      'role-1',
      ['p-users-delete'],
      expect.anything(),
    );
    expect(rolePermissions.removeMany).toHaveBeenCalledWith(
      'role-1',
      ['p-users-read'],
      expect.anything(),
    );
    expect(permissionsService.invalidate).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'permissions.assign',
        metadata: expect.objectContaining({
          added: ['users.delete'],
          removed: ['users.read'],
        }),
      }),
    );
  });

  it('no escribe nada cuando el conjunto no cambia', async () => {
    await useCase.execute({
      ...base,
      roleId: 'role-1',
      permissionIds: ['p-users-read'],
    });

    expect(rolePermissions.addMany).not.toHaveBeenCalled();
    expect(rolePermissions.removeMany).not.toHaveBeenCalled();
    expect(permissionsService.invalidate).not.toHaveBeenCalled();
  });

  /**
   * Lo base lo concede el guard por código: escribirlo en `role_permissions`
   * duplicaría la fuente de la verdad, y borrarlo daría la falsa impresión de
   * que se retiró.
   */
  it('ignora los permisos base del ámbito', async () => {
    await useCase.execute({
      ...base,
      roleId: 'role-1',
      permissionIds: ['p-users-read', 'p-catalogs-read'],
    });

    expect(rolePermissions.addMany).not.toHaveBeenCalled();
    expect(rolePermissions.removeMany).not.toHaveBeenCalled();
  });

  it('rechaza un permiso que no aplica al ámbito del rol', async () => {
    roles.findById.mockResolvedValue(
      roleOf({ code: 'RECLUTADOR', scope: RoleScope.COMPANY }),
    );

    const thrown = await useCase
      .execute({ ...base, roleId: 'role-1', permissionIds: ['p-users-delete'] })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).getStatus()).toBe(400);
    expect(rolePermissions.addMany).not.toHaveBeenCalled();
  });

  it('acepta un permiso propio del ámbito empresa', async () => {
    roles.findById.mockResolvedValue(
      roleOf({ code: 'RECLUTADOR', scope: RoleScope.COMPANY }),
    );
    rolePermissions.findPermissionIdsByRoleId.mockResolvedValue([]);

    await useCase.execute({
      ...base,
      roleId: 'role-1',
      permissionIds: ['p-promotions-create', 'p-vacancies-create'],
    });

    expect(rolePermissions.addMany).toHaveBeenCalledWith(
      'role-1',
      ['p-promotions-create', 'p-vacancies-create'],
      expect.anything(),
    );
  });

  /** El rol del aspirante no se administra: sus permisos viven en código. */
  it('rechaza con 409 el rol del aspirante', async () => {
    roles.findById.mockResolvedValue(
      roleOf({ code: 'CANDIDATE', isSystem: true, scope: RoleScope.CANDIDATE }),
    );

    const thrown = await useCase
      .execute({ ...base, roleId: 'role-1', permissionIds: [] })
      .catch((e: unknown) => e);

    expect((thrown as AppException).getStatus()).toBe(409);
    expect((thrown as AppException).getResponse()).toMatchObject({
      errorCode: ErrorCode.ROLE_IMMUTABLE,
    });
  });

  /** Sin esto, un descuido dejaría la plataforma sin nadie que pueda entrar. */
  it('no retira del ADMIN de sistema los permisos que abren el back-office', async () => {
    roles.findById.mockResolvedValue(
      roleOf({ code: 'ADMIN', isSystem: true, scope: RoleScope.PLATFORM }),
    );
    rolePermissions.findPermissionIdsByRoleId.mockResolvedValue([
      'p-users-read',
      'p-permissions-assign',
    ]);

    await useCase.execute({
      ...base,
      roleId: 'role-1',
      permissionIds: ['p-users-delete'],
    });

    expect(rolePermissions.removeMany).toHaveBeenCalledWith(
      'role-1',
      [],
      expect.anything(),
    );
  });

  it('rechaza con 404 un permiso inexistente', async () => {
    const thrown = await useCase
      .execute({ ...base, roleId: 'role-1', permissionIds: ['p-fantasma'] })
      .catch((e: unknown) => e);

    expect((thrown as AppException).getStatus()).toBe(404);
    expect((thrown as AppException).getResponse()).toMatchObject({
      errorCode: ErrorCode.PERMISSION_NOT_FOUND,
    });
  });
});
