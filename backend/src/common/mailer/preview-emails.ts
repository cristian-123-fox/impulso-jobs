import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  emailVerificationTemplate,
  notificationTemplate,
  passwordResetTemplate,
  type MailTemplate,
} from '@/common/mailer/mailer.templates';
import { resolveMailBranding } from '@/common/mailer/email-theme';

/**
 * Escribe los correos en `.tmp/mail-preview/` para poder abrirlos en el
 * navegador. `pnpm run mail:preview`.
 *
 * Existe porque **un correo no se puede revisar leyendo el código**: hay que
 * verlo. Y porque el adaptador de consola registra la versión de texto, así que
 * sin esto la única forma de mirar el HTML era mandarse un correo de verdad.
 *
 * ⚠️ El isotipo se sirve desde `APP_WEB_URL`. Si el portal no está levantado, el
 * hueco del logo sale vacío y se lee el `alt` — que es exactamente lo que verá
 * quien reciba el correo con las imágenes bloqueadas, así que también es útil
 * mirarlo así.
 */

const OUT_DIR = join(process.cwd(), '.tmp', 'mail-preview');

const CASES: ReadonlyArray<{
  file: string;
  label: string;
  mail: MailTemplate;
}> = [
  {
    file: 'verificacion-correo.html',
    label: 'Verificación de correo (registro)',
    mail: emailVerificationTemplate(
      `${resolveMailBranding().siteUrl}/auth/verificar-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ejemplo-de-token-largo-para-ver-como-rompe.abc123`,
      45,
    ),
  },
  {
    file: 'restablecer-password.html',
    label: 'Restablecer contraseña',
    mail: passwordResetTemplate(
      `${resolveMailBranding().siteUrl}/auth/restablecer-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.otro-token-de-ejemplo.def456`,
      30,
    ),
  },
  {
    file: 'notificacion-postulacion.html',
    label: 'Notificación · cambio de estado de una postulación',
    mail: notificationTemplate(
      'Actualización de tu postulación',
      'Tu postulación ahora está en estado: En revisión.',
      '/candidato/postulaciones',
    ),
  },
  {
    file: 'notificacion-suscripcion.html',
    label: 'Notificación · suscripción por vencer',
    mail: notificationTemplate(
      'Tu suscripción vence pronto',
      'La suscripción Plan Profesional de tu empresa vence el 30 de septiembre de 2026 (en 7 días). Renuévala para no perder los beneficios del plan.',
      '/empresa/promociones',
    ),
  },
  {
    file: 'notificacion-sin-enlace.html',
    label: 'Notificación · sin enlace (no pinta botón)',
    mail: notificationTemplate(
      'Denuncia resuelta',
      'Tu denuncia ha sido revisada y resuelta por el equipo de administración.',
    ),
  },
];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const { file, label, mail } of CASES) {
    writeFileSync(join(OUT_DIR, file), mail.html, 'utf8');
    writeFileSync(
      join(OUT_DIR, file.replace(/\.html$/, '.txt')),
      `Asunto: ${mail.subject}\n\n${mail.text}`,
      'utf8',
    );
    console.log(`  ${label}\n    ${join(OUT_DIR, file)}`);
  }

  console.log(
    `\n${CASES.length} correos escritos en ${OUT_DIR}` +
      `\nMarca: ${resolveMailBranding().siteUrl} (APP_WEB_URL)`,
  );
}

if (require.main === module) {
  main();
}

export { main as previewEmails };
