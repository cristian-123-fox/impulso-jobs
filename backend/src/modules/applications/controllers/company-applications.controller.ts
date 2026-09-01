import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  ApplicationAnswerResponseDto,
  ApplicationStatusHistoryResponseDto,
  ApplicationStatusResponseDto,
  CompanyApplicationResponseDto,
} from '@/modules/applications/dto/application-response.dto';
import {
  ChangeApplicationStatusDto,
  ListCompanyApplicationsQueryDto,
} from '@/modules/applications/dto/application.dto';
import { ApplicationStatusUseCase } from '@/modules/applications/use-cases/application-status.use-case';
import {
  CompanyApplicationActor,
  CompanyApplicationsUseCase,
  ListCompanyApplicationsResult,
} from '@/modules/applications/use-cases/company-applications.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('company-applications')
@ApiBearerAuth()
@Controller('company/applications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyApplicationsController {
  constructor(
    private readonly applications: CompanyApplicationsUseCase,
    private readonly status: ApplicationStatusUseCase,
  ) {}

  @Get()
  @RequirePermissions('applications.read')
  @ResponseMessage('Postulaciones obtenidas.')
  list(
    @Query() query: ListCompanyApplicationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ListCompanyApplicationsResult> {
    return this.applications.list({
      vacancyId: query.vacancyId,
      statusCode: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...this.actor(user, client),
    });
  }

  /** Catálogo de estados para el selector. Va antes de `:id` a propósito. */
  @Get('statuses')
  @RequirePermissions('applications.read')
  @ResponseMessage('Estados obtenidos.')
  statuses(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ApplicationStatusResponseDto[]> {
    return this.applications.listStatuses(this.actor(user, client));
  }

  @Get(':id')
  @RequirePermissions('applications.read')
  @ResponseMessage('Postulación obtenida.')
  get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyApplicationResponseDto> {
    return this.applications.get(id, this.actor(user, client));
  }

  @Get(':id/resume')
  @RequirePermissions('applications.read')
  async downloadResume(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.applications.getResumeDownload(
      id,
      this.actor(user, client),
    );

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );

    return new StreamableFile(result.stream);
  }

  @Get(':id/answers')
  @RequirePermissions('applications.read')
  @ResponseMessage('Respuestas obtenidas.')
  answers(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ApplicationAnswerResponseDto[]> {
    return this.applications.listAnswers(id, this.actor(user, client));
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

  @Put(':id/status')
  @RequirePermissions('applications.status.update')
  @ResponseMessage('Estado de la postulación actualizado.')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeApplicationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyApplicationResponseDto> {
    return this.status.changeStatus(id, dto.status, this.actor(user, client));
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): CompanyApplicationActor {
    return {
      userId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
