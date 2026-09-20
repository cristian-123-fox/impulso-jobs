import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { CandidateDashboardResponseDto } from '@/modules/dashboard/dto/candidate-dashboard-response.dto';
import {
  DEFAULT_DASHBOARD_PERIOD,
  DashboardQueryDto,
} from '@/modules/dashboard/dto/dashboard-query.dto';
import { CandidateDashboardUseCase } from '@/modules/dashboard/use-cases/candidate-dashboard.use-case';

/**
 * Panel del aspirante. El perfil se resuelve de la sesión: nunca viaja en la
 * URL, igual que el resto de `candidate/**`.
 *
 * `candidate_profile.read` es de la base del ámbito CANDIDATE, así que está
 * garantizado por código para todo aspirante (ver `SCOPE_BASELINE`).
 */
@ApiTags('candidate-dashboard')
@ApiBearerAuth()
@Controller('candidate/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateDashboardController {
  constructor(private readonly dashboard: CandidateDashboardUseCase) {}

  @Get()
  @RequirePermissions('candidate_profile.read')
  @ResponseMessage('Panel obtenido.')
  @ApiOkResponse({ type: CandidateDashboardResponseDto })
  get(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateDashboardResponseDto> {
    return this.dashboard.execute({
      userId: user.userId,
      days: query.days ?? DEFAULT_DASHBOARD_PERIOD,
    });
  }
}
