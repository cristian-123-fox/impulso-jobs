import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { Role } from '@/common/types/role.enum';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import { AdminDashboardResponseDto } from '@/modules/dashboard/dto/admin-dashboard-response.dto';
import {
  DEFAULT_DASHBOARD_PERIOD,
  DashboardQueryDto,
} from '@/modules/dashboard/dto/dashboard-query.dto';
import { AdminDashboardUseCase } from '@/modules/dashboard/use-cases/admin-dashboard.use-case';

/**
 * Panel del back-office. Rol **y** permiso, como el resto de `/admin/**`:
 * `users.read` lo comparten otros roles, y esto enseña datos de toda la
 * plataforma, no de una empresa.
 */
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles(Role.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardUseCase) {}

  @Get()
  @RequirePermissions('users.read')
  @ResponseMessage('Panel obtenido.')
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  get(@Query() query: DashboardQueryDto): Promise<AdminDashboardResponseDto> {
    return this.dashboard.execute({
      days: query.days ?? DEFAULT_DASHBOARD_PERIOD,
    });
  }
}
