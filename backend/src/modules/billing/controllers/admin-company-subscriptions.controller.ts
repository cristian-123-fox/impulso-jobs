import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { Role } from '@/common/types/role.enum';
import {
  AssignSubscriptionDto,
  RevokeSubscriptionDto,
  UpdateSubscriptionDto,
} from '@/modules/billing/dto/admin-subscription.dto';
import { SubscriptionResponseDto } from '@/modules/billing/dto/billing-response.dto';
import { AdminSubscriptionUseCase } from '@/modules/billing/use-cases/admin-subscription.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * T34 · El plan de una empresa, desde el back-office.
 *
 * **Vive en `billing`, no en `companies`**, aunque la ruta cuelgue de
 * `/admin/companies/:id`: `BillingModule` ya importa `CompaniesModule`, así que
 * meter estos endpoints en `AdminCompaniesController` cerraría un ciclo de DI.
 * Es el mismo motivo por el que `GET /auth/me` vive en `iam/session/`.
 *
 * **Rol *y* permiso**, como manda la convención de `/admin/**`: `plans.manage`
 * por sí solo no separa el back-office del autoservicio, y sin `RolesGuard` un
 * EMPLOYER podría tocar la suscripción de otra empresa. Se usa `plans.manage`
 * —que el rol ADMIN ya tiene— y no `subscriptions.manage`, que pertenece al
 * autoservicio de la empresa sobre la suya.
 */
@ApiTags('admin-companies')
@ApiBearerAuth()
@Controller('admin/companies/:companyId/subscription')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminCompanySubscriptionsController {
  constructor(private readonly useCase: AdminSubscriptionUseCase) {}

  @Get()
  @RequirePermissions('plans.manage')
  @ResponseMessage('Suscripción obtenida.')
  current(
    @Param('companyId') companyId: string,
  ): Promise<SubscriptionResponseDto | null> {
    return this.useCase.current(companyId);
  }

  /** Asigna el plan, o lo cambia si la empresa ya tenía uno. */
  @Post()
  @RequirePermissions('plans.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Plan asignado a la empresa.')
  assign(
    @Param('companyId') companyId: string,
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.useCase.assign({
      companyId,
      ...dto,
      actor: {
        userId: actor.userId,
        ip: client.ip,
        userAgent: client.userAgent,
      },
    });
  }

  @Patch()
  @RequirePermissions('plans.manage')
  @ResponseMessage('Suscripción actualizada.')
  update(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.useCase.update({
      companyId,
      ...dto,
      actor: {
        userId: actor.userId,
        ip: client.ip,
        userAgent: client.userAgent,
      },
    });
  }

  /** El motivo es obligatorio, así que el retiro lleva cuerpo. */
  @Delete()
  @RequirePermissions('plans.manage')
  @ResponseMessage('Plan retirado de la empresa.')
  revoke(
    @Param('companyId') companyId: string,
    @Body() dto: RevokeSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    return this.useCase.revoke({
      companyId,
      reason: dto.reason,
      actor: {
        userId: actor.userId,
        ip: client.ip,
        userAgent: client.userAgent,
      },
    });
  }
}
