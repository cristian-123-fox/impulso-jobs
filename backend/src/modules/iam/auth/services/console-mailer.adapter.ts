import { Injectable, Logger } from '@nestjs/common';
import {
  EmailVerificationEmail,
  MailerPort,
  PasswordResetEmail,
} from '@/modules/iam/auth/services/mailer.port';

/**
 * Adaptador de correo para desarrollo: registra el enlace en consola en vez de
 * enviarlo. Sustituir por un adaptador SMTP/Resend (con credenciales) en prod.
 */
@Injectable()
export class ConsoleMailerAdapter implements MailerPort {
  private readonly logger = new Logger('Mailer');

  sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    this.logger.log(
      `[DEV] Recuperación de contraseña para ${email.to} (expira en ${email.expiresInMinutes} min): ${email.link}`,
    );
    return Promise.resolve();
  }

  sendEmailVerification(email: EmailVerificationEmail): Promise<void> {
    this.logger.log(
      `[DEV] Verificación de correo para ${email.to} (expira en ${email.expiresInMinutes} min): ${email.link}`,
    );
    return Promise.resolve();
  }
}
