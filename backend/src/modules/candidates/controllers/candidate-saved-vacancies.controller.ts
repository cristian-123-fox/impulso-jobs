import {
  Controller,
  Delete,
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
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import type { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { SavedVacancyResponseDto } from '@/modules/candidates/dto/saved-vacancy-response.dto';
import {
  SavedVacanciesUseCase,
  SavedVacancyActor,
} from '@/modules/candidates/use-cases/saved-vacancies.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

/** T17 (fase 1): vacantes guardadas del aspirante. */
@ApiTags('candidate-saved-vacancies')
@ApiBearerAuth()
@Controller('candidate/saved-vacancies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateSavedVacanciesController {
  constructor(private readonly savedVacancies: SavedVacanciesUseCase) {}

  @Get()
  @RequirePermissions('saved_vacancies.manage')
  @ResponseMessage('Vacantes guardadas obtenidas.')
  list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PaginatedResponse<SavedVacancyResponseDto>> {
    return this.savedVacancies.list({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...this.actor(user, client),
    });
  }

  /** Ids guardados, para pintar el botón "Guardar" en el portal. */
  @Get('ids')
  @RequirePermissions('saved_vacancies.manage')
  @ResponseMessage('Ids de vacantes guardadas obtenidos.')
  listIds(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<string[]> {
    return this.savedVacancies.listIds(this.actor(user, client));
  }

  @Post(':vacancyId')
  @RequirePermissions('saved_vacancies.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Vacante guardada.')
  add(
    @Param('vacancyId') vacancyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SavedVacancyResponseDto> {
    return this.savedVacancies.add(vacancyId, this.actor(user, client));
  }

  @Delete(':vacancyId')
  @RequirePermissions('saved_vacancies.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('vacancyId') vacancyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    return this.savedVacancies.remove(vacancyId, this.actor(user, client));
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): SavedVacancyActor {
    return {
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
