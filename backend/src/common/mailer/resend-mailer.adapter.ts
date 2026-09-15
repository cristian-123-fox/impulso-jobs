import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailRequestOptions, Resend } from 'resend';
import { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * El SDK no declara `signal` entre sus opciones de petición, pero `post()`
 * las vuelca tal cual en el `fetch` interno (`{ method, body, ...options }`),
 * así que el AbortSignal sí llega. Sin él la petición puede quedarse colgada
 * hasta el timeout por defecto de undici (~5 min) bloqueando la operación de
 * negocio que la espera. Si un día el SDK filtrara las opciones conocidas,
 * el correo seguiría saliendo: sólo se perdería el corte a los 10 s.
 */
type ResendRequestOptions = CreateEmailRequestOptions & {
  signal?: AbortSignal;
};

/**
 * Adaptador de correo sobre el SDK oficial de Resend. Lee de las envs:
 *   RESEND_API_KEY (obligatoria, es la que activa este adaptador),
 *   MAIL_FROM (remitente; el dominio debe estar verificado en Resend),
 *   MAIL_REPLY_TO (opcional).
 *
 * El SDK se publica con build dual desde la 6.x (`dist/index.cjs` bajo la
 * condición `require`), así que convive con el backend CommonJS que se
 * despliega en cPanel — antes se hablaba con la API por `fetch` a mano
 * justamente porque no era el caso. Si se actualiza el SDK, comprueba que
 * `require('resend')` sigue resolviendo antes de desplegar.
 */
@Injectable()
export class ResendMailerAdapter implements MailerPort {
  private readonly logger = new Logger('ResendMailer');
  private readonly client: Resend;
  private readonly defaultFrom: string;
  private readonly replyTo?: string;

  constructor(config: ConfigService) {
    this.client = new Resend(config.get<string>('RESEND_API_KEY') ?? '');
    this.defaultFrom =
      config.get<string>('MAIL_FROM') ??
      config.get<string>('SMTP_FROM') ??
      'Impulso Jobs <onboarding@resend.dev>';
    this.replyTo = config.get<string>('MAIL_REPLY_TO') || undefined;
  }

  async send(options: SendMailOptions): Promise<void> {
    // En una variable tipada, no como literal en la llamada: `signal` no
    // está en `CreateEmailRequestOptions` y el chequeo de propiedades
    // sobrantes lo rechazaría.
    const requestOptions: ResendRequestOptions = {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    try {
      // El SDK no lanza ante un rechazo de la API: devuelve `{ data, error }`.
      const { data, error } = await this.client.emails.send(
        {
          from: this.defaultFrom,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          ...(this.replyTo ? { replyTo: this.replyTo } : {}),
        },
        requestOptions,
      );

      if (error) {
        // `name` es el código estable de Resend (dominio sin verificar,
        // clave inválida, rate limit…); sin él el log no sirve de nada.
        this.logger.error(
          `Resend rechazó el correo a ${options.to} (${error.name}): ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Correo enviado a ${options.to} [${data?.id ?? 'sin id'}]: ${options.subject}`,
      );
    } catch (error) {
      // Best-effort: un fallo de correo no tumba la operación de negocio
      // (mismo criterio que SmtpMailerAdapter). El SDK sólo llega aquí por
      // un fallo fuera de su control — el aborto por timeout, por ejemplo.
      this.logger.error(
        `Error enviando correo a ${options.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
