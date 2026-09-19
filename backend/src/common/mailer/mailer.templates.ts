import {
  type EmailBlock,
  type RenderedEmail,
  renderEmail,
} from '@/common/mailer/email-layout';

/**
 * Plantillas de los correos transaccionales. Cada función devuelve
 * `{ subject, html, text }` listo para `MailerPort.send()`.
 *
 * **Nadie escribe HTML aquí**: cada correo se describe con los bloques de
 * `email-layout.ts`, que los pinta con la maqueta de la marca y genera además la
 * versión en texto plano. Así el día que cambie el diseño se toca un archivo, no
 * tres plantillas, y el texto que viene de la base de datos va escapado.
 *
 * Los tres correos que existen hoy cubren **todo** lo que manda la plataforma:
 * verificación de correo y restablecimiento de contraseña (`iam/auth`) y el
 * genérico de notificación, que es el que usan las cinco fuentes de avisos
 * (cambio de estado de una postulación, vacante cerrada, denuncia nueva y
 * resuelta, y vencimiento de suscripción).
 */

export type MailTemplate = RenderedEmail;

const BRAND_SUFFIX = 'Impulso Jobs';

/** `Asunto — Impulso Jobs`, sin duplicar el sufijo si ya viene puesto. */
function withBrand(subject: string): string {
  return subject.includes(BRAND_SUFFIX)
    ? subject
    : `${subject} — ${BRAND_SUFFIX}`;
}

/** «45 minutos» / «1 minuto»: el singular chirría más de lo que parece. */
function minutes(value: number): string {
  return value === 1 ? '1 minuto' : `${value} minutos`;
}

export function passwordResetTemplate(
  link: string,
  expiresInMinutes: number,
): MailTemplate {
  const blocks: EmailBlock[] = [
    { kind: 'heading', text: 'Restablece tu contraseña' },
    {
      kind: 'paragraph',
      text: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.',
    },
    { kind: 'button', label: 'Restablecer contraseña', url: link },
    {
      kind: 'paragraph',
      text: `El enlace caduca en ${minutes(expiresInMinutes)} y sólo puede usarse una vez.`,
    },
    { kind: 'linkFallback', url: link },
    { kind: 'divider' },
    {
      kind: 'finePrint',
      text: 'Si no solicitaste este cambio, puedes ignorar este correo: tu contraseña seguirá siendo la misma.',
    },
  ];

  return renderEmail({
    subject: withBrand('Restablece tu contraseña'),
    preheader: `Enlace válido ${minutes(expiresInMinutes)} para elegir una contraseña nueva.`,
    blocks,
  });
}

export function emailVerificationTemplate(
  link: string,
  expiresInMinutes: number,
): MailTemplate {
  const blocks: EmailBlock[] = [
    { kind: 'heading', text: 'Verifica tu correo' },
    {
      kind: 'paragraph',
      text: 'Ya casi está. Confirma que esta dirección es tuya para activar tu cuenta y poder iniciar sesión.',
    },
    { kind: 'button', label: 'Verificar mi correo', url: link },
    {
      kind: 'paragraph',
      text: `El enlace caduca en ${minutes(expiresInMinutes)}. Si se te pasa, puedes pedir uno nuevo desde la pantalla de inicio de sesión.`,
    },
    { kind: 'linkFallback', url: link },
    { kind: 'divider' },
    {
      kind: 'finePrint',
      text: 'Si no creaste esta cuenta, ignora este correo y no se activará nada.',
    },
  ];

  return renderEmail({
    subject: withBrand('Verifica tu correo'),
    preheader: 'Confirma tu dirección para activar tu cuenta.',
    blocks,
  });
}

/**
 * Correo de una notificación de plataforma (T21).
 *
 * `title` y `body` los compone el caso de uso que avisa, e **interpolan datos de
 * usuario** —el nombre de un plan, el título de una vacante—, así que van
 * escapados por los bloques. `link` llega **relativo** (`/empresa/promociones`),
 * que es lo correcto dentro de la aplicación y no vale en una bandeja de
 * entrada: `absoluteUrl` le pone delante el host del portal.
 */
export function notificationTemplate(
  title: string,
  body: string,
  link?: string,
): MailTemplate {
  const blocks: EmailBlock[] = [
    { kind: 'heading', text: title },
    { kind: 'paragraph', text: body },
  ];

  if (link) {
    blocks.push({ kind: 'button', label: 'Ver en Impulso Jobs', url: link });
  }

  blocks.push(
    { kind: 'divider' },
    {
      kind: 'finePrint',
      text: 'Recibes este aviso porque tienes las notificaciones por correo activadas. Puedes desactivarlas desde la configuración de tu cuenta.',
    },
  );

  return renderEmail({
    subject: withBrand(title),
    // El cuerpo es de una frase: sirve tal cual como vista previa.
    preheader: body,
    blocks,
  });
}
