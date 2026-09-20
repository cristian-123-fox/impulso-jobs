import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';

/**
 * Adaptador SMTP real con nodemailer. Lee las credenciales de las envs:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * En desarrollo, si falta alguna env, cae al adaptador de consola (el
 * binding en el módulo debería elegir según la configuración).
 */
@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  private readonly logger = new Logger('SmtpMailer');
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    this.defaultFrom =
      config.get<string>('SMTP_FROM') ?? 'noreply@impulsojobs.com';
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'localhost',
      port: config.get<number>('SMTP_PORT') ?? 587,
      secure: config.get<number>('SMTP_PORT') === 465,
      auth: config.get<string>('SMTP_USER')
        ? {
            user: config.get<string>('SMTP_USER')!,
            pass: config.get<string>('SMTP_PASS') ?? '',
          }
        : undefined,
      logger: true,
      debug: false,
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        // Con `text` presente, nodemailer arma un `multipart/alternative`.
        ...(options.text && { text: options.text }),
      });
      this.logger.log(`Correo enviado a ${options.to}: ${options.subject}`);
    } catch (error) {
      // Best-effort: un fallo de SMTP no tumba la operación de negocio.
      this.logger.error(
        `Error enviando correo a ${options.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
