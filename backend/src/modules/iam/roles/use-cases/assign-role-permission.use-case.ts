import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
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

export interface AssignRolePermissionCommand {
  roleId: string;
  permissionId: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class AssignRolePermissionUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    private readonly permissionsService: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async execute(command: AssignRolePermissionCommand): Promise<void> {
    const role = await this.roles.findById(command.roleId);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }
    const permission = await this.permissions.findById(command.permissionId);
    if (!permission) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PERMISSION_NOT_FOUND,
        'Permiso no encontrado.',
      );
    }

    if (
      await this.rolePermissions.exists(command.roleId, command.permissionId)
    ) {
      return; // idempotente
    }

    await this.rolePermissions.add(command.roleId, command.permissionId);
    this.permissionsService.invalidate();

    await this.audit.record({
      action: 'permissions.assign',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: command.roleId,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { permission: permission.code },
    });
  }
}
