export { MAILER_PORT } from '@/common/mailer/mailer.port';
export type { MailerPort, SendMailOptions } from '@/common/mailer/mailer.port';
export {
  passwordResetTemplate,
  emailVerificationTemplate,
  notificationTemplate,
  type MailTemplate,
} from '@/common/mailer/mailer.templates';
// Maqueta y marca. Se exportan para escribir plantillas nuevas y para el
// previsualizador (`mail:preview`); los casos de uso no las necesitan.
export {
  renderEmail,
  escapeHtml,
  absoluteUrl,
  type EmailBlock,
  type EmailContent,
  type RenderedEmail,
} from '@/common/mailer/email-layout';
export {
  EMAIL_COLORS,
  EMAIL_FONT,
  EMAIL_WIDTH,
  resolveMailBranding,
  type MailBranding,
} from '@/common/mailer/email-theme';
