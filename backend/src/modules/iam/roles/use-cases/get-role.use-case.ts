import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';

export interface RoleWithPermissions {
  role: Role;
  permissionIds: string[];
}

@Injectable()
export class GetRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
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
    const permissionIds =
      await this.rolePermissions.findPermissionIdsByRoleId(id);
    return { role, permissionIds };
  }
}
