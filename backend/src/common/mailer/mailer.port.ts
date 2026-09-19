export const MAILER_PORT = 'MAILER_PORT';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  /**
   * Alternativa en texto plano del mismo contenido. Opcional por compatibilidad,
   * pero **conviene mandarla siempre**: un correo sólo-HTML pierde puntos en
   * varios filtros de spam, y hay clientes (y relojes) que no pintan HTML. Las
   * plantillas de `mailer.templates.ts` ya la devuelven hecha.
   */
  text?: string;
}

/**
 * Puerto genérico de envío de correos. Vivía en iam/auth con métodos
 * específicos (password-reset, email-verification); ahora es transversal:
 * notificaciones (T21), verificación de correo y reset de contraseña lo usan.
 *
 * Adaptadores intercambiables (consola en dev, SMTP en prod)
 * implementan esta interfaz.
 */
export interface MailerPort {
  send(options: SendMailOptions): Promise<void>;
}
