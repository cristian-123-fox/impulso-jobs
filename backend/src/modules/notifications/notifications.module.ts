import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@/common/mailer/mailer.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { NotificationsController } from '@/modules/notifications/controllers/notifications.controller';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/repositories/notification.repository.interface';
import { NotificationRepository } from '@/modules/notifications/repositories/notification.repository';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { GetUnreadCountUseCase } from '@/modules/notifications/use-cases/get-unread-count.use-case';
import { ListNotificationsUseCase } from '@/modules/notifications/use-cases/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '@/modules/notifications/use-cases/mark-notification-read.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';

/**
 * Módulo de notificaciones (T21). Provee:
 * - Tabla `notifications` (plataforma + correo best-effort)
 * - Endpoints para listar, contar no leídas y marcar como leídas
 * - `NotificationService` para que otros módulos creen notificaciones
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    MailerModule,
  ],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationRepository,
    },
    NotificationService,
    ListNotificationsUseCase,
    GetUnreadCountUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    NotificationService,
    TypeOrmModule.forFeature([Notification]),
  ],
})
export class NotificationsModule {}
