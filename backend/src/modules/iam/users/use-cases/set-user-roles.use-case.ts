import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  UserResponseDto,
  toUserResponse,
} from '@/modules/iam/users/dto/user-response.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';

export interface SetUserRolesCommand {
  userId: string;
  /** Conjunto completo de roles adicionales que debe quedar asignado. */
  roleIds: string[];
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Fija los roles *adicionales* de una cuenta (los personalizados creados en
 * `/admin/roles`). El rol base —ADMIN/EMPLOYER/CANDIDATE, marcado `isSystem`—
 * no se toca aquí: lo gobierna el campo `role` del usuario, porque de él
 * dependen la redirección y los guards del front.
 *
 * Al cambiar los roles cambian los permisos, así que se invalidan las sesiones
 * vigentes del usuario (`tokensValidFrom`): el access token ya emitido lleva
 * los `roleIds` antiguos.
 */
@Injectable()
export class SetUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly profiles: UserProfileResolver,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: SetUserRolesCommand): Promise<UserResponseDto> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }

    const requested = [...new Set(command.roleIds)];
    const roles = await this.roles.findByIds(requested);
    if (roles.length !== requested.length) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Alguno de los roles seleccionados no existe.',
      );
    }
    const systemRole = roles.find((role) => role.isSystem);
    if (systemRole) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_IMMUTABLE,
        `El rol ${systemRole.code} es un rol base: se cambia desde el rol del usuario.`,
      );
    }

    // Sólo se sincronizan los personalizados; los base se conservan intactos.
    const currentIds = await this.userRoles.findRoleIdsByUserId(user.id);
    const current = await this.roles.findByIds(currentIds);
    const currentExtraIds = current
      .filter((role) => !role.isSystem)
      .map((role) => role.id);

    const toAdd = requested.filter((id) => !currentExtraIds.includes(id));
    const toRemove = currentExtraIds.filter((id) => !requested.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return toUserResponse(user, await this.profiles.resolveOne(user));
    }

    user.tokensValidFrom = new Date();

    await runInTransaction(this.dataSource, async (manager) => {
      for (const roleId of toRemove) {
        await this.userRoles.remove(user.id, roleId, manager);
      }
      for (const roleId of toAdd) {
        await this.userRoles.add(user.id, roleId, manager);
      }
      await this.users.save(user, manager);

      await this.audit.record(
        {
          action: 'roles.assign',
          actorUserId: command.actorUserId,
          entity: 'user',
          entityId: user.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            added: roles.filter((r) => toAdd.includes(r.id)).map((r) => r.code),
            removed: current
              .filter((r) => toRemove.includes(r.id))
              .map((r) => r.code),
          },
        },
        manager,
      );
    });

    return toUserResponse(user, await this.profiles.resolveOne(user));
  }
}
