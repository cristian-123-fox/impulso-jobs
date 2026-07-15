import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
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
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import {
  ResetTokenPayload,
  TokenService,
} from '@/modules/iam/auth/services/token.service';

export interface ConfirmPasswordResetCommand {
  token: string;
  newPassword: string;
  confirmPassword: string;
  ip: string;
  userAgent: string;
}

/**
 * Cambia la contraseña con un token de un solo uso: valida, actualiza el hash e
 * invalida TODAS las sesiones activas (access por `tokens_valid_from`, refresh
 * revocados) y consume el token (blacklist).
 */
@Injectable()
export class ConfirmPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(TOKEN_USER_REPOSITORY)
    private readonly tokens: ITokenUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly tokenService: TokenService,
    private readonly hasher: PasswordHasherService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: ConfirmPasswordResetCommand): Promise<void> {
    if (command.newPassword !== command.confirmPassword) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.AUTH_PASSWORD_MISMATCH,
        'Las contraseñas no coinciden.',
      );
    }

    let payload: ResetTokenPayload;
    try {
      payload = await this.tokenService.verifyReset(command.token);
    } catch {
      throw this.invalidToken();
    }
    if (payload.type !== TokenType.RESET) throw this.invalidToken();
    if (await this.blacklist.existsByJti(payload.jti))
      throw this.invalidToken();

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) throw this.invalidToken();

    const passwordHash = await this.hasher.hash(command.newPassword);

    await runInTransaction(this.dataSource, async (manager) => {
      user.passwordHash = passwordHash;
      user.tokensValidFrom = new Date();
      user.failedAttempts = 0;
      user.blockedUntil = null;
      user.passwordResetAttempts = 0;
      user.passwordResetWindowStart = null;
      await this.users.save(user, manager);
      await this.tokens.revokeAllByUserId(user.id, manager);
      await this.blacklist.add(
        {
          jti: payload.jti,
          tokenType: TokenType.RESET,
          reason: 'password_reset',
        },
        manager,
      );
    });

    await this.audit.record({
      action: 'password_reset.confirm',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
  }

  private invalidToken(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.AUTH_INVALID_RESET_TOKEN,
      'El enlace no es válido, expiró o ya fue usado.',
    );
  }
}
