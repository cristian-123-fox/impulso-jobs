import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type ITokenUserRepository,
  TOKEN_USER_REPOSITORY,
} from '@/modules/iam/users/repositories/token-user.repository.interface';
import {
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  RefreshTokenPayload,
  TokenService,
} from '@/modules/iam/auth/services/token.service';

export interface RefreshCommand {
  refreshToken: string;
  ip: string;
  userAgent: string;
}

export interface RefreshResult {
  accessToken: string;
}

/** Renueva el access token a partir de un refresh válido, no revocado. */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(TOKEN_USER_REPOSITORY)
    private readonly tokens: ITokenUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.tokenService.verifyRefresh(command.refreshToken);
    } catch {
      throw this.invalidToken();
    }

    if (payload.type !== TokenType.REFRESH) {
      throw this.invalidToken();
    }

    if (await this.blacklist.existsByJti(payload.jti)) {
      throw this.revoked();
    }

    const stored = await this.tokens.findByJti(payload.jti);
    if (!stored || stored.revoked) {
      throw this.revoked();
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw this.invalidToken();
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw this.invalidToken();
    }
    if (user.blockedUntil && user.blockedUntil.getTime() > Date.now()) {
      throw new AppException(
        HttpStatus.LOCKED,
        ErrorCode.AUTH_ACCOUNT_BLOCKED,
        'Cuenta bloqueada temporalmente.',
      );
    }

    const access = await this.tokenService.signAccess({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.audit.record({
      action: 'auth.refresh',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return { accessToken: access.token };
  }

  private invalidToken(): AppException {
    return new AppException(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
      'Refresh token inválido o expirado.',
    );
  }

  private revoked(): AppException {
    return new AppException(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTH_TOKEN_REVOKED,
      'El token fue revocado. Inicia sesión de nuevo.',
    );
  }
}
