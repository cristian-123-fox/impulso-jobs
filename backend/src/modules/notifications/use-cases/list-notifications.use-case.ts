import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import {
  type INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@/modules/notifications/repositories/notification.repository.interface';
import {
  NotificationResponseDto,
  toNotificationResponse,
} from '@/modules/notifications/dto/notification-response.dto';

export interface ListNotificationsQuery {
  userId: string;
  onlyUnread?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
  ) {}

  async execute(
    query: ListNotificationsQuery,
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await this.notifications.findByUserId(query.userId, {
      onlyUnread: query.onlyUnread,
      page,
      limit,
    });

    const items = rows.map(toNotificationResponse);
    return toPaginated(items, total, page, limit);
  }
}
