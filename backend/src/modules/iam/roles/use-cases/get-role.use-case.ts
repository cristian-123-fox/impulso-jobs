import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { RoleScope } from '@/common/types/role-scope.enum';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { lockedPermissionCodes } from '@/modules/iam/permissions/catalogs/permission-catalog';
import {
  type IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';

export interface RoleWithPermissions {
  role: Role;
  /** Asignados a mano (filas de `role_permissions`). */
  permissionIds: string[];
  /**
   * Concedidos por el ámbito o blindados en el rol: van marcados y sin poder
   * desmarcarse. El árbol los necesita para no mentir sobre lo que el rol puede
   * hacer — un permiso base funciona aunque no tenga fila en la BD.
   */
  lockedPermissionIds: string[];
}

@Injectable()
export class GetRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
  ) {}

  async execute(id: string): Promise<RoleWithPermissions> {
    const role = await this.roles.findById(id);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }

    const [assigned, catalog] = await Promise.all([
      this.rolePermissions.findPermissionIdsByRoleId(id),
      this.permissions.findAll(),
    ]);

    const locked = lockedPermissionCodes(
      role.scope ?? RoleScope.PLATFORM,
      role.code,
      role.isSystem,
    );
    const lockedPermissionIds = catalog
      .filter((permission) => locked.has(permission.code))
      .map((permission) => permission.id);

    return { role, permissionIds: assigned, lockedPermissionIds };
  }
}
