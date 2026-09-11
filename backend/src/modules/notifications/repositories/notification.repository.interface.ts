import { EntityManager } from 'typeorm';
import { Notification } from '@/modules/notifications/entities/notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  findById(id: string, manager?: EntityManager): Promise<Notification | null>;
  findByUserId(
    userId: string,
    options: { onlyUnread?: boolean; page: number; limit: number },
    manager?: EntityManager,
  ): Promise<[Notification[], number]>;
  countUnreadByUserId(userId: string, manager?: EntityManager): Promise<number>;
  markAsRead(id: string, manager?: EntityManager): Promise<void>;
  markAllAsRead(userId: string, manager?: EntityManager): Promise<void>;
  save(
    notification: Notification,
    manager?: EntityManager,
  ): Promise<Notification>;
}
