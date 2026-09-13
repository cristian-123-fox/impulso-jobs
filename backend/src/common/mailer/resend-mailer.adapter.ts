import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Adaptador de correo sobre la API HTTP de Resend. Lee de las envs:
 *   RESEND_API_KEY (obligatoria, es la que activa este adaptador),
 *   MAIL_FROM (remitente; el dominio debe estar verificado en Resend),
 *   MAIL_REPLY_TO (opcional).
 *
 * Habla con la API por `fetch` en vez de con el SDK `resend` a propósito:
 * el backend se compila a CommonJS y se despliega en cPanel, y el SDK
 * arrastra dependencias ESM (mismo motivo por el que `sanitize-html` está
 * fijado en 2.16 — ver CLAUDE.md). Enviar un correo es un POST con JSON.
 */
@Injectable()
export class ResendMailerAdapter implements MailerPort {
  private readonly logger = new Logger('ResendMailer');
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly replyTo?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') ?? '';
    this.defaultFrom =
      config.get<string>('MAIL_FROM') ??
      config.get<string>('SMTP_FROM') ??
      'Impulso Jobs <onboarding@resend.dev>';
    this.replyTo = config.get<string>('MAIL_REPLY_TO') || undefined;
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.defaultFrom,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          ...(this.replyTo ? { reply_to: this.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        // Resend responde el detalle en el cuerpo (dominio sin verificar,
        // clave inválida, rate limit…); sin él el log no sirve de nada.
        const detail = await response.text().catch(() => '');
        this.logger.error(
          `Resend rechazó el correo a ${options.to} (${response.status}): ${detail}`,
        );
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        id?: string;
      } | null;
      this.logger.log(
        `Correo enviado a ${options.to} [${body?.id ?? 'sin id'}]: ${options.subject}`,
      );
    } catch (error) {
      // Best-effort: un fallo de correo no tumba la operación de negocio
      // (mismo criterio que SmtpMailerAdapter).
      this.logger.error(
        `Error enviando correo a ${options.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
