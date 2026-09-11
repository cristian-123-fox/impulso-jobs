import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT } from '@/common/mailer/mailer.port';
import { ConsoleMailerAdapter } from '@/common/mailer/console-mailer.adapter';
import { SmtpMailerAdapter } from '@/common/mailer/smtp-mailer.adapter';

/**
 * Módulo transversal de correo. Provee `MAILER_PORT` como global: si
 * `SMTP_HOST` está definido usa SMTP real, si no cae a consola (dev).
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
      useFactory: (config: ConfigService) => {
        const smtpHost = config.get<string>('SMTP_HOST');
        if (smtpHost) {
          return new SmtpMailerAdapter(config);
        }
        return new ConsoleMailerAdapter();
      },
    },
  ],
  exports: [MAILER_PORT],
})
export class MailerModule {}
