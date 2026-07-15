export const MAILER_PORT = 'MAILER_PORT';

export interface PasswordResetEmail {
  to: string;
  link: string;
  expiresInMinutes: number;
}

/**
 * Puerto de envío de correos. Adaptadores intercambiables (consola en dev,
 * SMTP/Resend en prod) implementan esta interfaz.
 */
export interface MailerPort {
  sendPasswordReset(email: PasswordResetEmail): Promise<void>;
}
