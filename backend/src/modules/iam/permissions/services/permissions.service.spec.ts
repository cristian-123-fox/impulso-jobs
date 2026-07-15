import { IRolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';

describe('PermissionsService', () => {
  let rolePermissions: jest.Mocked<IRolePermissionRepository>;
  let service: PermissionsService;

  beforeEach(() => {
    rolePermissions = {
      findRolePermissionCodes: jest.fn().mockResolvedValue([
        { roleId: 'r-admin', code: 'roles.read' },
        { roleId: 'r-admin', code: 'roles.create' },
        { roleId: 'r-employer', code: 'vacancies.create' },
      ]),
      findPermissionIdsByRoleId: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    service = new PermissionsService(rolePermissions);
  });

  it('concede cuando la unión de roles cubre los permisos requeridos', async () => {
    expect(await service.hasPermissions(['r-admin'], ['roles.read'])).toBe(
      true,
    );
    expect(
      await service.hasPermissions(['r-admin'], ['roles.read', 'roles.create']),
    ).toBe(true);
  });

  it('niega cuando falta algún permiso', async () => {
    expect(await service.hasPermissions(['r-employer'], ['roles.create'])).toBe(
      false,
    );
    expect(
      await service.hasPermissions(
        ['r-admin'],
        ['roles.read', 'vacancies.create'],
      ),
    ).toBe(false);
  });

  it('permite cuando no hay permisos requeridos', async () => {
    expect(await service.hasPermissions([], [])).toBe(true);
  });

  it('cachea el mapa y lo recarga sólo tras invalidate()', async () => {
    await service.hasPermissions(['r-admin'], ['roles.read']);
    await service.hasPermissions(['r-admin'], ['roles.read']);
    expect(rolePermissions.findRolePermissionCodes).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.hasPermissions(['r-admin'], ['roles.read']);
    expect(rolePermissions.findRolePermissionCodes).toHaveBeenCalledTimes(2);
  });
});
