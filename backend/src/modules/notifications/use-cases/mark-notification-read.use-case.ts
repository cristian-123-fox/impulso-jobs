import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  type INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@/modules/notifications/repositories/notification.repository.interface';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const notification = await this.notifications.findById(id);
    if (!notification) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'La notificación no existe.',
      );
    }
    if (notification.userId !== userId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'No tienes acceso a esta notificación.',
      );
    }
    await this.notifications.markAsRead(id);
  }
}
