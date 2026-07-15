import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import {
  type IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';

@Injectable()
export class ListRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
  ) {}

  async execute(roleId: string): Promise<Permission[]> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }
    const ids = await this.rolePermissions.findPermissionIdsByRoleId(roleId);
    return this.permissions.findByIds(ids);
  }
}
