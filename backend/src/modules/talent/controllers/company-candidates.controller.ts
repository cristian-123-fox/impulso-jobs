import {
  Controller,
  Get,
  Param,
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
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { CandidateDetailDto } from '@/modules/talent/dto/candidate-search-response.dto';
import { SearchCandidatesQueryDto } from '@/modules/talent/dto/candidate-search.dto';
import {
  CandidateSearchUseCase,
  SearchCandidatesResult,
  TalentActor,
} from '@/modules/talent/use-cases/candidate-search.use-case';
import { TalentQuotaSummary } from '@/modules/talent/services/talent-quota.service';

@ApiTags('company-candidates')
@ApiBearerAuth()
@Controller('company/candidates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyCandidatesController {
  constructor(private readonly candidates: CandidateSearchUseCase) {}

  /**
   * Listado y búsqueda del banco de talento. Gratuito: no consume cupo.
   * `GET /search` es un alias del mismo endpoint, por compatibilidad con la
   * especificación de la HU.
   */
  @Get()
  @RequirePermissions('candidates.search')
  @ResponseMessage('Candidatos obtenidos.')
  list(
    @Query() query: SearchCandidatesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SearchCandidatesResult> {
    return this.candidates.search({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...this.actor(user, client),
    });
  }

  @Get('search')
  @RequirePermissions('candidates.search')
  @ResponseMessage('Candidatos obtenidos.')
  search(
    @Query() query: SearchCandidatesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SearchCandidatesResult> {
    return this.list(query, user, client);
  }

  /** Cupo restante, para el contador de la UI. Va antes de `:id`. */
  @Get('quota')
  @RequirePermissions('candidates.search')
  @ResponseMessage('Cupo obtenido.')
  quota(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<TalentQuotaSummary> {
    return this.candidates.quotaSummary(this.actor(user, client));
  }

  /**
   * Detalle del candidato. **Consume una visita del cupo** si el perfil viene
   * de la base de talento y es la primera vez que esta empresa lo abre.
   */
  @Get(':id')
  @RequirePermissions('candidates.cv.read')
  @ResponseMessage('Candidato obtenido.')
  get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateDetailDto> {
    return this.candidates.get(id, this.actor(user, client));
  }

  /**
   * Fichero de una hoja de vida del candidato (T30). Sirve al visor del
   * front (`responseType: 'blob'`), así que la cabecera `attachment` no
   * estorba: el navegador nunca ve esta respuesta como una navegación.
   *
   * No consume cupo ni lo exige — ver `getResumeDownload` en el caso de uso.
   */
  @Get(':id/resumes/:resumeId')
  @RequirePermissions('candidates.cv.read')
  async resume(
    @Param('id') id: string,
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.candidates.getResumeDownload(
      id,
      resumeId,
      this.actor(user, client),
    );

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );

    return new StreamableFile(result.stream);
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): TalentActor {
    return {
      userId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
