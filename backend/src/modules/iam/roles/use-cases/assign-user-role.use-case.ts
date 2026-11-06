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

export interface AssignUserRoleCommand {
  userId: string;
  roleId: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class AssignUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: AssignUserRoleCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'Usuario no encontrado.',
      );
    }
    const role = await this.roles.findById(command.roleId);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }

    // Mismo contrato que `SetUserRolesUseCase`: este endpoint es aditivo y sólo
    // reparte roles personalizados de plataforma. Los base se cambian desde el
    // rol del usuario, y los de empresa desde el equipo de la empresa.
    if (role.isSystem) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_IMMUTABLE,
        `El rol ${role.code} es un rol base: se cambia desde el rol del usuario.`,
      );
    }
    if (role.companyId) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_ROLE_NOT_ASSIGNABLE,
        'Los roles de empresa se asignan desde el equipo de la empresa, no desde el back-office de usuarios.',
      );
    }

    if (await this.userRoles.exists(command.userId, command.roleId)) {
      return; // idempotente
    }

    const currentRoleIds = await this.userRoles.findRoleIdsByUserId(
      command.userId,
    );
    const roles = await this.roles.findByIds([
      ...currentRoleIds,
      command.roleId,
    ]);
    const primary = derivePrimaryRole(roles.map((r) => r.code));

    // El access token emitido lleva los `roleIds` antiguos. Sin renovar
    // `tokensValidFrom`, el rol nuevo no surte efecto hasta que caduque el
    // token (15 min) o el usuario vuelva a entrar.
    user.tokensValidFrom = new Date();

    await runInTransaction(this.dataSource, async (manager) => {
      await this.userRoles.add(command.userId, command.roleId, manager);
      if (primary && primary !== user.role) {
        user.role = primary;
      }
      await this.users.save(user, manager);
    });

    await this.audit.record({
      action: 'roles.assign',
      actorUserId: command.actorUserId,
      entity: 'user',
      entityId: command.userId,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { role: role.code },
    });
  }
}
