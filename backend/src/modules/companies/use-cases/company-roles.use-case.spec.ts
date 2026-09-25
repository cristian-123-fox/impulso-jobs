import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { RoleScope } from '@/common/types/role-scope.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanyRolesUseCase } from '@/modules/companies/use-cases/company-roles.use-case';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { IPermissionRepository } from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { IRolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';

const ACTOR = { actorUserId: 'owner-1', ip: '127.0.0.1', userAgent: 'jest' };

function permission(code: string): Permission {
  return Object.assign(new Permission(), { id: `p-${code}`, code });
}

const PERMISSIONS = [
  permission('vacancies.read'),
  permission('vacancies.create'),
  permission('applications.read'),
  // De empresa pero EMPLOYER no lo tiene en este entorno.
  permission('subscriptions.manage'),
  // Sólo back-office: nunca se ofrece a una empresa.
  permission('users.delete'),
  // Base del ámbito: se enseña bloqueado.
  permission('catalogs.read'),
];

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('CompanyRolesUseCase', () => {
  let roles: jest.Mocked<IRoleRepository>;
  let rolePermissions: jest.Mocked<IRolePermissionRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let useCase: CompanyRolesUseCase;
  let companyRoles: Role[];

  beforeEach(() => {
    companyRoles = [
      Object.assign(new Role(), {
        id: 'role-junior',
        name: 'Reclutador junior',
        companyId: 'company-1',
        scope: RoleScope.COMPANY,
        createdAt: new Date(),
      }),
    ];

    roles = {
      findByCode: jest
        .fn()
        .mockResolvedValue(Object.assign(new Role(), { id: 'role-employer' })),
      findByCompanyId: jest.fn(() => Promise.resolve(companyRoles)),
      findById: jest.fn((id: string) =>
        Promise.resolve(
          id === 'role-ajeno'
            ? Object.assign(new Role(), { id, companyId: 'company-2' })
            : (companyRoles.find((r) => r.id === id) ?? null),
        ),
      ),
      save: jest.fn((role: Role) =>
        Promise.resolve(
          Object.assign(role, {
            id: role.id || 'role-nuevo',
            createdAt: role.createdAt ?? new Date(),
          }),
        ),
      ),
      remove: jest.fn(),
    } as unknown as jest.Mocked<IRoleRepository>;

    rolePermissions = {
      findPermissionIdsByRoleId: jest.fn().mockResolvedValue([]),
      addMany: jest.fn(),
      removeByRoleId: jest.fn(),
    } as unknown as jest.Mocked<IRolePermissionRepository>;

    const permissions = {
      findAll: jest.fn().mockResolvedValue(PERMISSIONS),
    } as unknown as jest.Mocked<IPermissionRepository>;

    userRoles = {
      countByRoleId: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<IUserRoleRepository>;

    permissionsService = {
      permissionsForRoles: jest
        .fn()
        .mockResolvedValue(
          new Set([
            'vacancies.read',
            'vacancies.create',
            'applications.read',
            'users.delete',
            'catalogs.read',
          ]),
        ),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<PermissionsService>;

    const dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new CompanyRolesUseCase(
      roles,
      rolePermissions,
      permissions,
      userRoles,
      permissionsService,
      { record: jest.fn() } as unknown as AuditService,
      dataSource,
    );
  });

  describe('catalog', () => {
    it('ofrece sólo permisos de empresa que EMPLOYER tiene, y la base bloqueada', async () => {
      const { permissions } = await useCase.catalog();
      const codes = permissions.map((p) => p.code);

      expect(codes).toEqual(
        expect.arrayContaining([
          'vacancies.read',
          'vacancies.create',
          'applications.read',
          'catalogs.read',
        ]),
      );
      // Back-office, aunque EMPLOYER lo tuviera por error.
      expect(codes).not.toContain('users.delete');
      // De empresa, pero por encima de lo que tiene EMPLOYER.
      expect(codes).not.toContain('subscriptions.manage');
      expect(permissions.find((p) => p.code === 'catalogs.read')?.locked).toBe(
        true,
      );
    });
  });

  describe('create', () => {
    it('crea el rol de la empresa con ámbito COMPANY y sus permisos', async () => {
      const result = await useCase.create(
        'company-1',
        {
          name: 'Solo lectura',
          permissionCodes: ['vacancies.read', 'applications.read'],
        },
        ACTOR,
      );

      expect(roles.save).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          scope: RoleScope.COMPANY,
          isSystem: false,
        }),
        expect.anything(),
      );
      expect(rolePermissions.addMany).toHaveBeenCalledWith(
        'role-nuevo',
        ['p-vacancies.read', 'p-applications.read'],
        expect.anything(),
      );
      expect(result.permissionCodes).toEqual([
        'applications.read',
        'vacancies.read',
      ]);
      expect(permissionsService.invalidate).toHaveBeenCalled();
    });

    it('descarta en silencio los permisos base: no hace falta guardarlos', async () => {
      await useCase.create(
        'company-1',
        {
          name: 'Básico',
          permissionCodes: ['catalogs.read', 'vacancies.read'],
        },
        ACTOR,
      );

      expect(rolePermissions.addMany).toHaveBeenCalledWith(
        'role-nuevo',
        ['p-vacancies.read'],
        expect.anything(),
      );
    });

    it('rechaza un permiso que la empresa no puede repartir', async () => {
      const error = await useCase
        .create(
          'company-1',
          { name: 'Colado', permissionCodes: ['users.delete'] },
          ACTOR,
        )
        .catch((e: unknown) => e);

      expect(errorCodeOf(error)).toBe(ErrorCode.VALIDATION_ERROR);
      expect(roles.save).not.toHaveBeenCalled();
    });

    it('rechaza un nombre repetido en la misma empresa (sin distinguir mayúsculas)', async () => {
      const error = await useCase
        .create(
          'company-1',
          { name: '  reclutador JUNIOR ', permissionCodes: [] },
          ACTOR,
        )
        .catch((e: unknown) => e);

      expect(errorCodeOf(error)).toBe(ErrorCode.COMPANY_ROLE_NAME_TAKEN);
    });
  });

  describe('aislamiento', () => {
    it('un rol de otra empresa responde como inexistente', async () => {
      const error = await useCase
        .update(
          'company-1',
          'role-ajeno',
          { name: 'x', permissionCodes: [] },
          ACTOR,
        )
        .catch((e: unknown) => e);

      expect(errorCodeOf(error)).toBe(ErrorCode.COMPANY_ROLE_NOT_FOUND);
    });
  });

  describe('remove', () => {
    it('no borra un rol con miembros', async () => {
      userRoles.countByRoleId.mockResolvedValueOnce(2);

      const error = await useCase
        .remove('company-1', 'role-junior', ACTOR)
        .catch((e: unknown) => e);

      expect(errorCodeOf(error)).toBe(ErrorCode.COMPANY_ROLE_IN_USE);
      expect(roles.remove).not.toHaveBeenCalled();
    });

    it('borra el rol y su matriz si nadie lo tiene', async () => {
      await useCase.remove('company-1', 'role-junior', ACTOR);

      expect(rolePermissions.removeByRoleId).toHaveBeenCalledWith(
        'role-junior',
        expect.anything(),
      );
      expect(roles.remove).toHaveBeenCalledWith(
        'role-junior',
        expect.anything(),
      );
      expect(permissionsService.invalidate).toHaveBeenCalled();
    });
  });
});
