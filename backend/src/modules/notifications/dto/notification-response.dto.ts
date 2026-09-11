import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

export interface NotificationResponseDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function toNotificationResponse(n: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  readAt?: Date | null;
  createdAt: Date;
}): NotificationResponseDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link ?? null,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
