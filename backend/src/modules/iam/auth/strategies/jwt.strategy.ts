import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AccessTokenPayload } from '@/modules/iam/auth/services/token.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';

/**
 * Valida el access token: firma + expiración (Passport), tipo, no revocado
 * (blacklist) y usuario activo. Devuelve la identidad adjuntada al request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private roles?: IRoleRepository;
  private permissions?: PermissionsService;

  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly moduleRef: ModuleRef,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  private getRoles(): IRoleRepository {
    if (!this.roles) {
      this.roles = this.moduleRef.get(ROLE_REPOSITORY, { strict: false });
    }
    return this.roles;
  }

  private getPermissions(): PermissionsService {
    if (!this.permissions) {
      this.permissions = this.moduleRef.get(PermissionsService, {
        strict: false,
      });
    }
    return this.permissions;
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== TokenType.ACCESS) {
      throw this.unauthorized();
    }
    if (await this.blacklist.existsByJti(payload.jti)) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_TOKEN_REVOKED,
        'El token fue revocado. Inicia sesión de nuevo.',
      );
    }
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw this.unauthorized();
    }
    if (
      user.tokensValidFrom &&
      typeof payload.iat === 'number' &&
      payload.iat < Math.floor(user.tokensValidFrom.getTime() / 1000)
    ) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_TOKEN_REVOKED,
        'La sesión fue invalidada. Inicia sesión de nuevo.',
      );
    }
    let roleIds = await this.userRoles.findRoleIdsByUserId(user.id);

    // Defensive fallback: si el usuario no tiene user_roles (creado antes
    // del RBAC o el seed no corrió), auto-asigna el rol desde users.role.
    if (roleIds.length === 0 && user.role) {
      const role = await this.getRoles().findByCode(user.role);
      if (role) {
        await this.userRoles.add(user.id, role.id);
        roleIds = [role.id];
        this.getPermissions().invalidate();
        this.logger.warn(
          `Auto-asignado rol ${user.role} al usuario ${user.id} (faltaba en user_roles)`,
        );
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      roleIds,
      jti: payload.jti,
    };
  }

  private unauthorized(): AppException {
    return new AppException(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED,
      'No autorizado.',
    );
  }
}
