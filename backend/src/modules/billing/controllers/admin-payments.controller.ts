import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { Role } from '@/common/types/role.enum';
import {
  AdminPaymentResponseDto,
  ListAdminPaymentsQueryDto,
  RejectPaymentDto,
} from '@/modules/billing/dto/admin-payment.dto';
import { AdminPaymentsUseCase } from '@/modules/billing/use-cases/admin-payments.use-case';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * Cola de cobros: órdenes de promociones y suscripciones, y la confirmación
 * manual mientras no haya pasarela. Rol *y* permiso, como todo `/admin/**`.
 * Se usa `plans.manage`, el mismo que ya protegía `POST /payments/confirm`.
 */
@ApiTags('admin-payments')
@ApiBearerAuth()
@Controller('admin/payments')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsUseCase) {}

  @Get()
  @RequirePermissions('plans.manage')
  @ResponseMessage('Pagos obtenidos.')
  list(
    @Query() query: ListAdminPaymentsQueryDto,
  ): Promise<PaginatedResponse<AdminPaymentResponseDto>> {
    return this.payments.list(query);
  }

  @Post(':id/confirm')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Pago confirmado.')
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AdminPaymentResponseDto> {
    return this.payments.confirm(id, this.actor(user, client));
  }

  /** Consulta a la pasarela y aplica el estado real (webhook perdido). */
  @Post(':id/sync')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Pago sincronizado con la pasarela.')
  sync(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AdminPaymentResponseDto> {
    return this.payments.sync(id, this.actor(user, client));
  }

  @Post(':id/reject')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Pago rechazado.')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AdminPaymentResponseDto> {
    return this.payments.reject(id, dto.reason, this.actor(user, client));
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): BillingActor {
    return { userId: user.userId, ip: client.ip, userAgent: client.userAgent };
  }
}
