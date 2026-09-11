import { Injectable, Logger } from '@nestjs/common';
import { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';

/**
 * Adaptador de correo para desarrollo: registra el contenido en consola en
 * vez de enviarlo. Sustituir por un adaptador SMTP/Resend (con credenciales)
 * en prod.
 */
@Injectable()
export class ConsoleMailerAdapter implements MailerPort {
  private readonly logger = new Logger('Mailer');

  send(options: SendMailOptions): Promise<void> {
    this.logger.log(
      `[DEV] Correo a ${options.to} — Asunto: ${options.subject}\n${options.html}`,
    );
    return Promise.resolve();
  }
}
