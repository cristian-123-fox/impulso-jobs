import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { comparePassword, hashPassword } from '@/common/utils/password.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip: string;
  userAgent: string;
}

/**
 * Cambio de contraseña por el propio titular.
 *
 * Pide la contraseña actual a propósito: sin esa re-autenticación, un token
 * robado bastaría para quedarse con la cuenta. Es el mismo criterio que aplica
 * la baja de cuenta (`DeleteAccountUseCase`).
 *
 * ⚠️ **Al guardar se cierran todas las sesiones**, incluida la que hizo la
 * petición: `tokensValidFrom` invalida cualquier token emitido antes de este
 * instante. Es lo deseable — si alguien más tenía la contraseña vieja, queda
 * fuera — pero obliga al cliente a avisar antes y a mandar al login después.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'No autorizado.',
      );
    }

    const valid = await comparePassword(
      command.currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'La contraseña actual no es correcta.',
      );
    }

    // Repetir la misma clave no cambia nada y deja al usuario fuera de su
    // sesión sin ganar nada: se rechaza antes de tocar `tokensValidFrom`.
    const repeated = await comparePassword(
      command.newPassword,
      user.passwordHash,
    );
    if (repeated) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CONFLICT,
        'La contraseña nueva debe ser distinta de la actual.',
      );
    }

    user.passwordHash = await hashPassword(command.newPassword);
    user.tokensValidFrom = new Date();
    user.failedAttempts = 0;
    user.blockedUntil = null;
    await this.users.save(user);

    await this.audit.record({
      action: 'account.password.change',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
  }
}
