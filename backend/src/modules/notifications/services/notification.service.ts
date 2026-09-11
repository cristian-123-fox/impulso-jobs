import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MAILER_PORT,
  type MailerPort,
  notificationTemplate,
} from '@/common/mailer';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import {
  type INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@/modules/notifications/repositories/notification.repository.interface';

export interface NotifyCommand {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Si se debe enviar correo (best-effort). Se determina por las preferencias. */
  sendEmail?: boolean;
}

/**
 * Servicio central de notificaciones (T21). Crea la fila en `notifications`,
 * y opcionalmente envía un correo best-effort.
 *
 * Los use-cases de otros módulos llaman a `notify()` en lugar de tocar
 * la entidad directamente.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
  ) {}

  /**
   * Crea una notificación en plataforma y, si `sendEmail` es true,
   * envía un correo best-effort. Un fallo de correo no impide la
   * notificación en plataforma.
   */
  async notify(command: NotifyCommand): Promise<Notification> {
    const notification = new Notification();
    notification.userId = command.userId;

    notification.type = command.type;
    notification.title = command.title;
    notification.body = command.body;
    notification.link = command.link ?? null;

    const saved = await this.notifications.save(notification);

    if (command.sendEmail) {
      this.logger.log(
        `Notificación ${saved.id} creada para usuario ${command.userId} (correo pendiente)`,
      );
    }

    return saved;
  }

  /**
   * Envía un correo asociado a una notificación ya creada.
   * Se llama desde el use-case que tiene acceso al email del usuario.
   */
  async sendNotificationEmail(
    toEmail: string,
    title: string,
    body: string,
    link?: string,
  ): Promise<void> {
    try {
      const template = notificationTemplate(title, body, link);
      await this.mailer.send({
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      // Best-effort: un fallo de SMTP no tumba la operación de negocio.
      this.logger.error(
        `Error enviando correo de notificación a ${toEmail}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
