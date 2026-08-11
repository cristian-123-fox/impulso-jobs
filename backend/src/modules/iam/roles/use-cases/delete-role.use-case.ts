import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

export interface DeleteRoleCommand {
  id: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Borra un rol **personalizado**. Los de sistema (`is_system`) sostienen la
 * matriz que siembra `seed:rbac` y el rol primario de las cuentas, así que no
 * se tocan; un rol asignado a alguien tampoco, para no dejar cuentas sin los
 * permisos que ya usaban — primero se les quita el rol.
 */
@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly permissionsService: PermissionsService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roles.findById(command.id);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }

    if (role.isSystem) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_IMMUTABLE,
        'Los roles de sistema no se pueden eliminar.',
      );
    }

    const assigned = await this.userRoles.countByRoleId(role.id);
    if (assigned > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_IN_USE,
        `El rol está asignado a ${assigned} cuenta(s). Quítaselo antes de eliminarlo.`,
      );
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await this.rolePermissions.removeByRoleId(role.id, manager);
      await this.roles.remove(role.id, manager);
    });

    // El guard lee un mapa cacheado (rol → permisos): sin esto seguiría vivo.
    this.permissionsService.invalidate();

    await this.audit.record({
      action: 'roles.delete',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: role.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { code: role.code },
    });
  }
}
