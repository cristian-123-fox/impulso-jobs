import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT, MailerPort } from '@/common/mailer/mailer.port';
import { ConsoleMailerAdapter } from '@/common/mailer/console-mailer.adapter';
import { SmtpMailerAdapter } from '@/common/mailer/smtp-mailer.adapter';

/**
 * Elige el adaptador de correo por configuración, en este orden:
 *   1. SMTP_HOST → SMTP con nodemailer (Gmail u otro proveedor).
 *   2. nada      → consola (desarrollo): el correo se escribe en el log.
 *
 * Está fuera del decorador para poder probar la elección sin levantar Nest.
 */
export function createMailerAdapter(config: ConfigService): MailerPort {
  const logger = new Logger('MailerModule');

  if (config.get<string>('SMTP_HOST')) {
    logger.log('Correo: SMTP');
    return new SmtpMailerAdapter(config);
  }
  logger.warn(
    'Correo: consola — sin SMTP_HOST no se envía nada, sólo se registra en el log',
  );
  return new ConsoleMailerAdapter();
}

/**
 * Módulo transversal de correo. Provee `MAILER_PORT` eligiendo adaptador
 * por configuración (ver `createMailerAdapter`).
 *
 * Otros módulos sólo necesitan `@Inject(MAILER_PORT)` — no importan este
 * módulo directamente si ya está en la cadena de imports de un módulo que
 * lo importe (o lo declaran global).
 */
@Module({
  providers: [
    {
      provide: MAILER_PORT,
      inject: [ConfigService],
      useFactory: createMailerAdapter,
    },
  ],
  exports: [MAILER_PORT],
})
export class MailerModule {}
