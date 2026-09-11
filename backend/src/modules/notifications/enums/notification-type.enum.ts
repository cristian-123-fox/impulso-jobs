/**
 * Tipos de notificación. Cada tipo define el template de correo
 * y el link de la notificación en plataforma.
 */
export enum NotificationType {
  /** El estado de una postulación del candidato cambió */
  APPLICATION_STATUS_CHANGED = 'APPLICATION_STATUS_CHANGED',
  /** Una vacante guardada por el candidato se cerró */
  SAVED_VACANCY_CLOSED = 'SAVED_VACANCY_CLOSED',
  /** Verificación de correo (solo plataforma, no correo) */
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  /** Nueva postulación recibida por una empresa */
  NEW_APPLICATION_RECEIVED = 'NEW_APPLICATION_RECEIVED',
  /** Un plan de la empresa está por vencer */
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  /** Una promoción de la empresa caducó */
  PROMOTION_EXPIRED = 'PROMOTION_EXPIRED',
  /** Una denuncia fue resuelta (notifica al denunciante) */
  VACANCY_REPORT_RESOLVED = 'VACANCY_REPORT_RESOLVED',
  /** Denuncia nueva (notifica a admin) */
  VACANCY_REPORT_NEW = 'VACANCY_REPORT_NEW',
  /** Pago manual pendiente de confirmar (notifica a admin) */
  PAYMENT_PENDING_CONFIRM = 'PAYMENT_PENDING_CONFIRM',
}
