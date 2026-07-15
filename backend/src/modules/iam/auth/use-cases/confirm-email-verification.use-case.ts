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
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  TokenService,
  VerifyTokenPayload,
} from '@/modules/iam/auth/services/token.service';

export interface ConfirmEmailVerificationCommand {
  token: string;
  ip: string;
  userAgent: string;
}

export interface ConfirmEmailVerificationResult {
  alreadyVerified: boolean;
}

/**
 * Confirma la verificación de correo con un token de un solo uso: valida, marca
 * `email_verified_at` (idempotente si ya estaba verificado) y consume el token
 * (blacklist).
 */
@Injectable()
export class ConfirmEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(
    command: ConfirmEmailVerificationCommand,
  ): Promise<ConfirmEmailVerificationResult> {
    let payload: VerifyTokenPayload;
    try {
      payload = await this.tokenService.verifyEmailVerification(command.token);
    } catch {
      throw this.invalidToken();
    }
    if (payload.type !== TokenType.VERIFY) throw this.invalidToken();
    if (await this.blacklist.existsByJti(payload.jti))
      throw this.invalidToken();

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) throw this.invalidToken();

    const alreadyVerified = !!user.emailVerifiedAt;

    await runInTransaction(this.dataSource, async (manager) => {
      if (!alreadyVerified) {
        user.emailVerifiedAt = new Date();
        user.emailVerificationAttempts = 0;
        user.emailVerificationWindowStart = null;
        await this.users.save(user, manager);
      }
      await this.blacklist.add(
        {
          jti: payload.jti,
          tokenType: TokenType.VERIFY,
          reason: 'email_verification',
        },
        manager,
      );
    });

    await this.audit.record({
      action: 'email_verification.confirm',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { alreadyVerified },
    });

    return { alreadyVerified };
  }

  private invalidToken(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN,
      'El enlace de verificación no es válido, expiró o ya fue usado.',
    );
  }
}
