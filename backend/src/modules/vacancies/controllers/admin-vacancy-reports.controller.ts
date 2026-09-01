import {
  Controller,
  Get,
  Param,
  Patch,
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
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import {
  ListVacancyReportsQueryDto,
  VacancyReportResponseDto,
} from '@/modules/vacancies/dto/vacancy-report.dto';
import { VacancyReportsUseCase } from '@/modules/vacancies/use-cases/vacancy-reports.use-case';

/**
 * Cola de moderación de denuncias. Rol *y* permiso, como todo /admin:
 * el permiso `vacancies.*` también lo tiene EMPLOYER sobre lo suyo, así que
 * el `@RequireRoles(ADMIN)` es lo que separa el back-office.
 */
@ApiTags('admin-vacancy-reports')
@ApiBearerAuth()
@Controller('admin/vacancy-reports')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminVacancyReportsController {
  constructor(private readonly reports: VacancyReportsUseCase) {}

  @Get()
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Denuncias obtenidas.')
  list(
    @Query() query: ListVacancyReportsQueryDto,
  ): Promise<PaginatedResponse<VacancyReportResponseDto>> {
    return this.reports.listForAdmin(query);
  }

  @Patch(':id/resolve')
  @RequirePermissions('vacancies.status')
  @ResponseMessage('Denuncia resuelta.')
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyReportResponseDto> {
    return this.reports.resolve(id, {
      userId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
