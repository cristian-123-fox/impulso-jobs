import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  ResetTokenPayload,
  TokenService,
} from '@/modules/iam/auth/services/token.service';

/** Verifica que un token de reset sea válido, no usado y de un usuario activo. */
@Injectable()
export class ValidatePasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(token: string): Promise<{ valid: true }> {
    await this.resolve(token);
    return { valid: true };
  }

  private async resolve(token: string): Promise<ResetTokenPayload> {
    let payload: ResetTokenPayload;
    try {
      payload = await this.tokenService.verifyReset(token);
    } catch {
      throw this.invalid();
    }
    if (payload.type !== TokenType.RESET) throw this.invalid();
    if (await this.blacklist.existsByJti(payload.jti)) throw this.invalid();

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) throw this.invalid();
    return payload;
  }

  private invalid(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.AUTH_INVALID_RESET_TOKEN,
      'El enlace no es válido o expiró. Solicita uno nuevo.',
    );
  }
}
