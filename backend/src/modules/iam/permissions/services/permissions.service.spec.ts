import { RoleScope } from '@/common/types/role-scope.enum';
import { IRolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { IRoleScopeRepository } from '@/modules/iam/permissions/repositories/role-scope.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';

describe('PermissionsService', () => {
  let rolePermissions: jest.Mocked<IRolePermissionRepository>;
  let roleScopes: jest.Mocked<IRoleScopeRepository>;
  let service: PermissionsService;

  beforeEach(() => {
    rolePermissions = {
      findRolePermissionCodes: jest.fn().mockResolvedValue([
        { roleId: 'r-admin', code: 'roles.read' },
        { roleId: 'r-admin', code: 'roles.create' },
        { roleId: 'r-employer', code: 'vacancies.create' },
      ]),
      findPermissionIdsByRoleId: jest.fn(),
      countByRole: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      addMany: jest.fn(),
      remove: jest.fn(),
      removeMany: jest.fn(),
      removeByRoleId: jest.fn(),
    };
    roleScopes = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'r-admin',
          code: 'ADMIN',
          scope: RoleScope.PLATFORM,
          isSystem: true,
        },
        {
          id: 'r-employer',
          code: 'EMPLOYER',
          scope: RoleScope.COMPANY,
          isSystem: true,
        },
        {
          id: 'r-candidate',
          code: 'CANDIDATE',
          scope: RoleScope.CANDIDATE,
          isSystem: true,
        },
        {
          id: 'r-nuevo',
          code: 'SOPORTE',
          scope: RoleScope.PLATFORM,
          isSystem: false,
        },
      ]),
    };
    service = new PermissionsService(rolePermissions, roleScopes);
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

  /**
   * El aspirante no tiene su rol en la matriz administrable: si sus permisos
   * dependieran de `role_permissions`, un entorno sin `pnpm seed` lo dejaría
   * sin poder postular ni subir su CV.
   */
  it('concede al aspirante sus permisos sin ninguna fila en role_permissions', async () => {
    expect(
      await service.hasPermissions(
        ['r-candidate'],
        [
          'applications.create',
          'resumes.manage',
          'saved_vacancies.manage',
          'candidate_profile.update',
          'settings.update',
        ],
      ),
    ).toBe(true);
  });

  it('no le da al aspirante permisos de otro ámbito', async () => {
    expect(
      await service.hasPermissions(['r-candidate'], ['vacancies.create']),
    ).toBe(false);
    expect(await service.hasPermissions(['r-candidate'], ['users.read'])).toBe(
      false,
    );
  });

  it('un rol personalizado recién creado ya tiene lo básico', async () => {
    expect(
      await service.hasPermissions(
        ['r-nuevo'],
        ['catalogs.read', 'notifications.read', 'account.profile_manage'],
      ),
    ).toBe(true);
    expect(await service.hasPermissions(['r-nuevo'], ['users.delete'])).toBe(
      false,
    );
  });

  /** Sin esto, desmarcar una casilla dejaría el back-office sin llave. */
  it('blinda los permisos que abren el back-office en el rol ADMIN', async () => {
    expect(
      await service.hasPermissions(
        ['r-admin'],
        ['users.read', 'roles.read', 'permissions.assign'],
      ),
    ).toBe(true);
  });

  it('cachea el mapa y lo recarga sólo tras invalidate()', async () => {
    await service.hasPermissions(['r-admin'], ['roles.read']);
    await service.hasPermissions(['r-admin'], ['roles.read']);
    expect(rolePermissions.findRolePermissionCodes).toHaveBeenCalledTimes(1);
    expect(roleScopes.findAll).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.hasPermissions(['r-admin'], ['roles.read']);
    expect(rolePermissions.findRolePermissionCodes).toHaveBeenCalledTimes(2);
    expect(roleScopes.findAll).toHaveBeenCalledTimes(2);
  });
});
