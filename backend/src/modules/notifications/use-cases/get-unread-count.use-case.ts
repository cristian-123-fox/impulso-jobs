import { Inject, Injectable } from '@nestjs/common';
import {
  type INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@/modules/notifications/repositories/notification.repository.interface';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
  ) {}

  async execute(userId: string): Promise<{ count: number }> {
    const count = await this.notifications.countUnreadByUserId(userId);
    return { count };
  }
}
