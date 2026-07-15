import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import {
  type MailerPort,
  MAILER_PORT,
} from '@/modules/iam/auth/services/mailer.port';

export interface RequestPasswordResetCommand {
  email: string;
  ip: string;
  userAgent: string;
}

export const MAX_RESET_REQUESTS = 3;
const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESET_EXPIRES_MINUTES = 30;

/**
 * Genera y "envía" un magic link de recuperación. Respuesta siempre genérica:
 * sólo actúa si el usuario existe, está activo y no excedió el límite (3/24h).
 */
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly webUrl: string;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly tokenService: TokenService,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.webUrl = config.get<string>('APP_WEB_URL') ?? 'http://localhost:4200';
  }

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    const blocked =
      !!user?.blockedUntil && user.blockedUntil.getTime() > Date.now();

    if (!user || user.status !== UserStatus.ACTIVE || blocked) {
      await this.audit.record({
        action: 'password_reset.request.ignored',
        entity: 'user',
        entityId: user?.id ?? null,
        ip: command.ip,
        userAgent: command.userAgent,
        metadata: { email },
      });
      return;
    }

    const now = Date.now();
    if (
      !user.passwordResetWindowStart ||
      now - user.passwordResetWindowStart.getTime() > RESET_WINDOW_MS
    ) {
      user.passwordResetWindowStart = new Date();
      user.passwordResetAttempts = 0;
    }

    if (user.passwordResetAttempts >= MAX_RESET_REQUESTS) {
      await this.users.save(user);
      await this.audit.record({
        action: 'password_reset.request.rate_limited',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
      });
      return;
    }

    user.passwordResetAttempts += 1;
    await this.users.save(user);

    const reset = await this.tokenService.signReset(user.id);
    const link = `${this.webUrl}/auth/restablecer-password?token=${reset.token}`;
    await this.mailer.sendPasswordReset({
      to: user.email,
      link,
      expiresInMinutes: RESET_EXPIRES_MINUTES,
    });

    await this.audit.record({
      action: 'password_reset.request.sent',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
  }
}
