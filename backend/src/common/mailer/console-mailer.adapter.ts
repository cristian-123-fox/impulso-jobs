import { Injectable, Logger } from '@nestjs/common';
import { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';

/**
 * Adaptador de correo para desarrollo: registra el contenido en consola en
 * vez de enviarlo. Sustituir por un adaptador SMTP (con credenciales) en prod.
 *
 * Registra la **versión en texto plano** cuando la hay: el HTML de la maqueta
 * son ~5 KB de tablas que llenan el log sin que se lea nada. El HTML se sigue
 * pudiendo ver con `MAIL_LOG_HTML=true`.
 */
@Injectable()
export class ConsoleMailerAdapter implements MailerPort {
  private readonly logger = new Logger('Mailer');

  send(options: SendMailOptions): Promise<void> {
    const logHtml =
      process.env.MAIL_LOG_HTML?.trim().toLowerCase() === 'true' ||
      !options.text;
    const content = logHtml ? options.html : options.text;

    this.logger.log(
      `[DEV] Correo a ${options.to} — Asunto: ${options.subject}\n${content}`,
    );
    return Promise.resolve();
  }
}
