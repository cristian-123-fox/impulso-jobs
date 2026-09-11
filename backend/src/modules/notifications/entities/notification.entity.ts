import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

/**
 * Notificación en plataforma (T21). Cada fila representa un evento
 * dirigido a un usuario: cambio de estado de postulación, plan por vencer,
 * denuncia resuelta, etc.
 *
 * La notificación puede tener un correo asociado (best-effort); si el
 * envío falla, la notificación sigue visible en plataforma.
 */
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_user_read', ['userId', 'readAt'])
@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 50,
  })
  type!: NotificationType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'body', type: 'text' })
  body!: string;

  @Column({ name: 'link', type: 'varchar', length: 500, nullable: true })
  link?: string | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;
}
