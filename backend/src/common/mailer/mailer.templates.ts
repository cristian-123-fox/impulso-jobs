/**
 * Plantillas HTML para correos transaccionales.
 * Cada función recibe datos y devuelve { subject, html } listos para
 * pasar a MailerPort.send().
 */

interface MailTemplate {
  subject: string;
  html: string;
}

export function passwordResetTemplate(
  link: string,
  expiresInMinutes: number,
): MailTemplate {
  return {
    subject: 'Restablece tu contraseña — Impulso Jobs',
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1f3b73;margin-bottom:16px">Restablece tu contraseña</h2>
        <p style="color:#374151;line-height:1.6">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Haz clic en el siguiente enlace (válido por ${expiresInMinutes} minutos):
        </p>
        <p style="margin:24px 0">
          <a href="${link}"
             style="background-color:#e47c3f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña
          permanecerá igual.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
        <p style="color:#9ca3af;font-size:12px;text-align:center">
          Impulso Jobs — Portal de empleabilidad para México
        </p>
      </div>`,
  };
}

export function emailVerificationTemplate(
  link: string,
  expiresInMinutes: number,
): MailTemplate {
  return {
    subject: 'Verifica tu correo — Impulso Jobs',
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1f3b73;margin-bottom:16px">Verifica tu dirección de correo</h2>
        <p style="color:#374151;line-height:1.6">
          Para completar tu registro, verifica tu correo electrónico. Haz clic
          en el siguiente enlace (válido por ${expiresInMinutes} minutos):
        </p>
        <p style="margin:24px 0">
          <a href="${link}"
             style="background-color:#e47c3f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
            Verificar correo
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          Si no creaste esta cuenta, puedes ignorar este correo.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
        <p style="color:#9ca3af;font-size:12px;text-align:center">
          Impulso Jobs — Portal de empleabilidad para México
        </p>
      </div>`,
  };
}

export function notificationTemplate(
  title: string,
  body: string,
  link?: string,
): MailTemplate {
  const linkHtml = link
    ? `<p style="margin:24px 0">
        <a href="${link}"
           style="background-color:#e47c3f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Ver detalles
        </a>
      </p>`
    : '';

  return {
    subject: title,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1f3b73;margin-bottom:16px">${title}</h2>
        <p style="color:#374151;line-height:1.6">${body}</p>
        ${linkHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
        <p style="color:#9ca3af;font-size:12px;text-align:center">
          Impulso Jobs — Portal de empleabilidad para México
        </p>
      </div>`,
  };
}
