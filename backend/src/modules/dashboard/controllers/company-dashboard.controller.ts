import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { CompanyDashboardResponseDto } from '@/modules/dashboard/dto/company-dashboard-response.dto';
import {
  DEFAULT_DASHBOARD_PERIOD,
  DashboardQueryDto,
} from '@/modules/dashboard/dto/dashboard-query.dto';
import { CompanyDashboardUseCase } from '@/modules/dashboard/use-cases/company-dashboard.use-case';

/**
 * Panel de inicio de la empresa. La empresa **nunca viaja en la URL**: se
 * resuelve de la sesión, igual que el resto de `company/**`.
 *
 * Exige los dos permisos que cubren lo que pinta —vacantes y postulaciones—
 * porque el panel enseña ambos embudos; un rol que sólo pueda ver vacantes no
 * debería ver el detalle del proceso de selección por la puerta de atrás.
 */
@ApiTags('company-dashboard')
@ApiBearerAuth()
@Controller('company/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyDashboardController {
  constructor(private readonly dashboard: CompanyDashboardUseCase) {}

  @Get()
  @RequirePermissions('vacancies.read', 'applications.read')
  @ResponseMessage('Panel obtenido.')
  @ApiOkResponse({ type: CompanyDashboardResponseDto })
  get(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyDashboardResponseDto> {
    return this.dashboard.execute({
      userId: user.userId,
      days: query.days ?? DEFAULT_DASHBOARD_PERIOD,
    });
  }
}
