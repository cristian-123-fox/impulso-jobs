import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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

/**
 * Valida el access token: firma + expiración (Passport), tipo, no revocado
 * (blacklist) y usuario activo. Devuelve la identidad adjuntada al request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
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
    const roleIds = await this.userRoles.findRoleIdsByUserId(user.id);
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
