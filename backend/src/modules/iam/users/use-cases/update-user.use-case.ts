import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
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

export interface UpdateUserCommand {
  id: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  emailVerified?: boolean;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Edición administrativa de una cuenta: correo, rol, estado, verificación y
 * restablecimiento de contraseña. Cambiar la contraseña o desactivar la cuenta
 * invalida las sesiones vigentes vía `tokensValidFrom`. El administrador no
 * puede degradarse ni desactivarse a sí mismo (evita quedarse fuera).
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly hasher: PasswordHasherService,
    private readonly profiles: UserProfileResolver,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserResponseDto> {
    const user = await this.users.findById(command.id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }

    const isSelf = user.id === command.actorUserId;
    const changesRole =
      command.role !== undefined && command.role !== user.role;
    const deactivates =
      command.status !== undefined && command.status !== UserStatus.ACTIVE;
    if (isSelf && (changesRole || deactivates)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CONFLICT,
        'No puedes cambiar tu propio rol ni desactivar tu cuenta.',
      );
    }

    if (command.email) {
      const email = command.email.trim().toLowerCase();
      if (email !== user.email) {
        const existing = await this.users.findByEmail(email);
        if (existing && existing.id !== user.id) {
          throw new AppException(
            HttpStatus.CONFLICT,
            ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
            'Ya existe una cuenta con este correo.',
          );
        }
        user.email = email;
      }
    }

    const previousRole = user.role;
    let nextRoleId: string | null = null;
    let previousRoleId: string | null = null;
    if (changesRole) {
      const next = await this.roles.findByCode(command.role!);
      const previous = await this.roles.findByCode(previousRole);
      if (!next) {
        throw new AppException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ErrorCode.INTERNAL_ERROR,
          `El rol ${command.role!} no existe. Ejecuta el seed RBAC.`,
        );
      }
      nextRoleId = next.id;
      previousRoleId = previous?.id ?? null;
      user.role = command.role!;
    }

    if (command.status !== undefined) {
      user.status = command.status;
      // Reactivar limpia el bloqueo temporal por intentos fallidos.
      if (command.status === UserStatus.ACTIVE) {
        user.blockedUntil = null;
        user.failedAttempts = 0;
      }
    }

    if (command.emailVerified !== undefined) {
      user.emailVerifiedAt = command.emailVerified
        ? (user.emailVerifiedAt ?? new Date())
        : null;
    }

    if (command.password) {
      user.passwordHash = await this.hasher.hash(command.password);
      user.tokensValidFrom = new Date();
      user.failedAttempts = 0;
      user.blockedUntil = null;
    } else if (deactivates) {
      user.tokensValidFrom = new Date();
    }

    let saved!: typeof user;
    await runInTransaction(this.dataSource, async (manager) => {
      saved = await this.users.save(user, manager);

      if (nextRoleId) {
        if (previousRoleId) {
          await this.userRoles.remove(saved.id, previousRoleId, manager);
        }
        await this.userRoles.add(saved.id, nextRoleId, manager);
      }

      await this.audit.record(
        {
          action: 'users.update',
          actorUserId: command.actorUserId,
          entity: 'user',
          entityId: saved.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            role: changesRole ? { from: previousRole, to: saved.role } : null,
            status: command.status ?? null,
            passwordReset: Boolean(command.password),
          },
        },
        manager,
      );
    });

    return toUserResponse(saved, await this.profiles.resolveOne(saved));
  }
}
