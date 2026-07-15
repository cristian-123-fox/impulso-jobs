import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { derivePrimaryRole } from '@/modules/iam/roles/utils/derive-primary-role';

export interface RemoveUserRoleCommand {
  userId: string;
  roleId: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class RemoveUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: RemoveUserRoleCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'Usuario no encontrado.',
      );
    }
    if (!(await this.userRoles.exists(command.userId, command.roleId))) {
      return; // nada que quitar
    }

    const remainingIds = (
      await this.userRoles.findRoleIdsByUserId(command.userId)
    ).filter((id) => id !== command.roleId);
    const roles = await this.roles.findByIds(remainingIds);
    const primary = derivePrimaryRole(roles.map((r) => r.code));

    await runInTransaction(this.dataSource, async (manager) => {
      await this.userRoles.remove(command.userId, command.roleId, manager);
      if (primary && primary !== user.role) {
        user.role = primary;
        await this.users.save(user, manager);
      }
    });

    await this.audit.record({
      action: 'roles.unassign',
      actorUserId: command.actorUserId,
      entity: 'user',
      entityId: command.userId,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { roleId: command.roleId },
    });
  }
}
