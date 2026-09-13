import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

/**
 * Preferencias de notificación por usuario. Controla si cada tipo de
 * notificación llega por correo, en plataforma, o ambos.
 *
 * Se almacena como JSON en una columna del perfil (candidato/empresa)
 * o en una tabla separada. Por simplicidad se modela como interface
 * y se persiste como JSON en la entidad de settings del candidato
 * (o en una tabla `user_notification_preferences` si se prefiere).
 */
export interface NotificationPreference {
  type: NotificationType;
  /** Si la notificación aparece en la bandeja de la plataforma */
  platform: boolean;
  /** Si se envía un correo electrónico (best-effort) */
  email: boolean;
}

/** Set de preferencias por defecto (todo activado). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    type: NotificationType.APPLICATION_STATUS_CHANGED,
    platform: true,
    email: true,
  },
  { type: NotificationType.SAVED_VACANCY_CLOSED, platform: true, email: true },
  { type: NotificationType.EMAIL_VERIFICATION, platform: true, email: false },
  {
    type: NotificationType.NEW_APPLICATION_RECEIVED,
    platform: true,
    email: true,
  },
  { type: NotificationType.SUBSCRIPTION_EXPIRING, platform: true, email: true },
  { type: NotificationType.SUBSCRIPTION_ASSIGNED, platform: true, email: true },
  { type: NotificationType.SUBSCRIPTION_UPDATED, platform: true, email: true },
  { type: NotificationType.SUBSCRIPTION_REVOKED, platform: true, email: true },
  { type: NotificationType.PROMOTION_EXPIRED, platform: true, email: true },
  {
    type: NotificationType.VACANCY_REPORT_RESOLVED,
    platform: true,
    email: true,
  },
  { type: NotificationType.VACANCY_REPORT_NEW, platform: true, email: true },
  {
    type: NotificationType.PAYMENT_PENDING_CONFIRM,
    platform: true,
    email: true,
  },
];
