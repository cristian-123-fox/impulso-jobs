import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { GetUnreadCountUseCase } from '@/modules/notifications/use-cases/get-unread-count.use-case';
import { ListNotificationsUseCase } from '@/modules/notifications/use-cases/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '@/modules/notifications/use-cases/mark-notification-read.use-case';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly listUseCase: ListNotificationsUseCase,
    private readonly unreadCountUseCase: GetUnreadCountUseCase,
    private readonly markReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  @ResponseMessage('Notificaciones listadas.')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    return this.listUseCase.execute({
      userId: user.userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      onlyUnread: onlyUnread === 'true',
    });
  }

  @Get('unread-count')
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Conteo de notificaciones no leídas' })
  @ResponseMessage('Conteo obtenido.')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.unreadCountUseCase.execute(user.userId);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ResponseMessage('Notificación marcada como leída.')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.markReadUseCase.execute(id, user.userId);
  }

  @Post('read-all')
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ResponseMessage('Todas las notificaciones marcadas como leídas.')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.markAllReadUseCase.execute(user.userId);
  }
}
