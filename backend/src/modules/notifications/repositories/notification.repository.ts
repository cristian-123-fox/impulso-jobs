import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { INotificationRepository } from '@/modules/notifications/repositories/notification.repository.interface';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Notification | null> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    return repo.findOne({ where: { id } });
  }

  async findByUserId(
    userId: string,
    options: { onlyUnread?: boolean; page: number; limit: number },
    manager?: EntityManager,
  ): Promise<[Notification[], number]> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    const where: Record<string, unknown> = { userId };
    if (options.onlyUnread) {
      where.readAt = IsNull();
    }
    return repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
  }

  async countUnreadByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    return repo.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async markAsRead(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    await repo.update(id, { readAt: new Date() });
  }

  async markAllAsRead(userId: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    await repo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async save(
    notification: Notification,
    manager?: EntityManager,
  ): Promise<Notification> {
    const repo = manager ? manager.getRepository(Notification) : this.repo;
    return repo.save(notification);
  }
}
