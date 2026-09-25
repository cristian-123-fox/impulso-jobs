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
          companyId: null,
        },
        {
          id: 'r-employer',
          code: 'EMPLOYER',
          scope: RoleScope.COMPANY,
          isSystem: true,
          companyId: null,
        },
        {
          id: 'r-candidate',
          code: 'CANDIDATE',
          scope: RoleScope.CANDIDATE,
          isSystem: true,
          companyId: null,
        },
        {
          id: 'r-nuevo',
          code: 'SOPORTE',
          scope: RoleScope.PLATFORM,
          isSystem: false,
          companyId: null,
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

  describe('roles de empresa', () => {
    beforeEach(() => {
      rolePermissions.findRolePermissionCodes.mockResolvedValue([
        { roleId: 'r-employer', code: 'vacancies.create' },
        { roleId: 'r-employer', code: 'vacancies.read' },
        // El rol de empresa tiene una fila que EMPLOYER no: quizá el
        // back-office se la retiró a EMPLOYER después.
        { roleId: 'r-junior', code: 'vacancies.read' },
        { roleId: 'r-junior', code: 'plans.manage' },
      ]);
      roleScopes.findAll.mockResolvedValue([
        {
          id: 'r-employer',
          code: 'EMPLOYER',
          scope: RoleScope.COMPANY,
          isSystem: true,
          companyId: null,
        },
        {
          id: 'r-junior',
          code: 'CO_ABC',
          scope: RoleScope.COMPANY,
          isSystem: false,
          companyId: 'company-1',
        },
      ]);
    });

    it('conserva lo que EMPLOYER también tiene y la base del ámbito', async () => {
      const granted = await service.permissionsForRoles(['r-junior']);

      expect(granted.has('vacancies.read')).toBe(true);
      expect(granted.has('catalogs.read')).toBe(true);
    });

    it('nunca supera a EMPLOYER aunque tenga la fila', async () => {
      const granted = await service.permissionsForRoles(['r-junior']);

      expect(granted.has('plans.manage')).toBe(false);
      // Y tampoco hereda lo que EMPLOYER sí tiene pero a él no se le dio.
      expect(granted.has('vacancies.create')).toBe(false);
    });
  });
});
