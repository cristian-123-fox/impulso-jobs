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

export interface RequestEmailVerificationCommand {
  email: string;
  ip: string;
  userAgent: string;
}

export const MAX_VERIFICATION_REQUESTS = 3;
const VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_EXPIRES_MINUTES = 30;

/**
 * (Re)envía el magic link de verificación de correo. Respuesta siempre genérica:
 * sólo actúa si el usuario existe, está activo, aún no está verificado y no
 * excedió el límite (3/24h).
 */
@Injectable()
export class RequestEmailVerificationUseCase {
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

  async execute(command: RequestEmailVerificationCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Cuenta inexistente, eliminada o suspendida → respuesta genérica.
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.audit.record({
        action: 'email_verification.resend.ignored',
        entity: 'user',
        entityId: user?.id ?? null,
        ip: command.ip,
        userAgent: command.userAgent,
        metadata: { email },
      });
      return;
    }

    // Ya verificado → no se reenvía (pero respuesta genérica).
    if (user.emailVerifiedAt) {
      await this.audit.record({
        action: 'email_verification.resend.already_verified',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
      });
      return;
    }

    const now = Date.now();
    if (
      !user.emailVerificationWindowStart ||
      now - user.emailVerificationWindowStart.getTime() > VERIFICATION_WINDOW_MS
    ) {
      user.emailVerificationWindowStart = new Date();
      user.emailVerificationAttempts = 0;
    }

    if (user.emailVerificationAttempts >= MAX_VERIFICATION_REQUESTS) {
      await this.users.save(user);
      await this.audit.record({
        action: 'email_verification.resend.rate_limited',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
      });
      return;
    }

    user.emailVerificationAttempts += 1;
    await this.users.save(user);

    const verification = await this.tokenService.signEmailVerification(user.id);
    const link = `${this.webUrl}/auth/verificar-email?token=${verification.token}`;
    await this.mailer.sendEmailVerification({
      to: user.email,
      link,
      expiresInMinutes: VERIFICATION_EXPIRES_MINUTES,
    });

    await this.audit.record({
      action: 'email_verification.resend.sent',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
  }
}
