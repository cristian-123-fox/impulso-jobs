import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
import { Role } from '@/common/types/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  PlanFeatureResponseDto,
  PlanResponseDto,
} from '@/modules/billing/dto/billing-response.dto';
import {
  ChangePlanStatusDto,
  SavePlanDto,
  SavePlanFeatureDto,
  SetPlanFeaturesDto,
} from '@/modules/billing/dto/billing.dto';
import {
  BillingActor,
  PlanCatalogUseCase,
} from '@/modules/billing/use-cases/plan-catalog.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * Back-office del catálogo. Los precios en MXN y el alcance de la Anual se dan
 * de alta **aquí**, no en la semilla: son decisiones de negocio.
 */
@ApiTags('admin-plans')
@ApiBearerAuth()
@Controller('admin')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminPlansController {
  constructor(private readonly catalog: PlanCatalogUseCase) {}

  @Get('plans')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Planes obtenidos.')
  list(): Promise<PlanResponseDto[]> {
    return this.catalog.list(false);
  }

  @Post('plans')
  @RequirePermissions('plans.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Plan creado.')
  create(
    @Body() dto: SavePlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PlanResponseDto> {
    return this.catalog.create(dto, this.actor(user, client));
  }

  /** Catálogo de beneficios. Va antes de `plans/:id` para no colisionar. */
  @Get('plan-features')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Beneficios obtenidos.')
  listFeatures(): Promise<PlanFeatureResponseDto[]> {
    return this.catalog.listFeatures();
  }

  @Post('plan-features')
  @RequirePermissions('plans.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Beneficio guardado.')
  createFeature(
    @Body() dto: SavePlanFeatureDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PlanFeatureResponseDto> {
    return this.catalog.createFeature(dto, this.actor(user, client));
  }

  @Get('plans/:id')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Plan obtenido.')
  get(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.catalog.get(id);
  }

  @Put('plans/:id')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Plan actualizado.')
  update(
    @Param('id') id: string,
    @Body() dto: SavePlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PlanResponseDto> {
    return this.catalog.update(id, dto, this.actor(user, client));
  }

  @Patch('plans/:id/status')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Estado del plan actualizado.')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangePlanStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PlanResponseDto> {
    return this.catalog.changeStatus(
      id,
      dto.isActive,
      this.actor(user, client),
    );
  }

  @Put('plans/:id/features')
  @RequirePermissions('plans.manage')
  @ResponseMessage('Beneficios del plan actualizados.')
  setFeatures(
    @Param('id') id: string,
    @Body() dto: SetPlanFeaturesDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PlanResponseDto> {
    return this.catalog.setPlanFeatures(
      id,
      dto.features,
      this.actor(user, client),
    );
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): BillingActor {
    return { userId: user.userId, ip: client.ip, userAgent: client.userAgent };
  }
}
