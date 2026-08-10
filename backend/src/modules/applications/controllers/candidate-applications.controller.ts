import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  ApplicationStatusHistoryResponseDto,
  CandidateApplicationResponseDto,
} from '@/modules/applications/dto/application-response.dto';
import {
  CreateApplicationDto,
  ListCandidateApplicationsQueryDto,
} from '@/modules/applications/dto/application.dto';
import {
  CandidateApplicationActor,
  CandidateApplicationsUseCase,
} from '@/modules/applications/use-cases/candidate-applications.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('candidate-applications')
@ApiBearerAuth()
@Controller('candidate/applications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateApplicationsController {
  constructor(private readonly applications: CandidateApplicationsUseCase) {}

  @Post()
  @RequirePermissions('applications.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Postulación enviada.')
  apply(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateApplicationResponseDto> {
    return this.applications.apply({
      vacancyId: dto.vacancyId,
      resumeId: dto.resumeId,
      ...this.actor(user, client),
    });
  }

  @Get()
  @RequirePermissions('applications.read')
  @ResponseMessage('Postulaciones obtenidas.')
  list(
    @Query() query: ListCandidateApplicationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PaginatedResponse<CandidateApplicationResponseDto>> {
    return this.applications.list({
      statusCode: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...this.actor(user, client),
    });
  }

  @Get(':id')
  @RequirePermissions('applications.read')
  @ResponseMessage('Postulación obtenida.')
  get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateApplicationResponseDto> {
    return this.applications.get(id, this.actor(user, client));
  }

  @Get(':id/history')
  @RequirePermissions('applications.read')
  @ResponseMessage('Historial obtenido.')
  history(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ApplicationStatusHistoryResponseDto[]> {
    return this.applications.listHistory(id, this.actor(user, client));
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): CandidateApplicationActor {
    return {
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
