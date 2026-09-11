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
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import {
  CompanyVacancyQuestionDto,
  ReplaceVacancyQuestionsDto,
} from '@/modules/vacancies/dto/vacancy-question.dto';
import {
  CompanyVacancySkillDto,
  ReplaceVacancySkillsDto,
} from '@/modules/vacancies/dto/vacancy-skill.dto';
import { VacancyResponseDto } from '@/modules/vacancies/dto/vacancy-response.dto';
import {
  ChangeVacancyStatusDto,
  ListCompanyVacanciesQueryDto,
  ReactivateVacancyDto,
  SaveVacancyDto,
} from '@/modules/vacancies/dto/vacancy.dto';
import { Skill } from '@/modules/vacancies/entities/skill.entity';
import {
  CompanyVacanciesUseCase,
  ListCompanyVacanciesResult,
  VacancyActor,
} from '@/modules/vacancies/use-cases/company-vacancies.use-case';
import { VacancyQuestionsUseCase } from '@/modules/vacancies/use-cases/vacancy-questions.use-case';
import { VacancySkillsUseCase } from '@/modules/vacancies/use-cases/vacancy-skills.use-case';
import { VacancyStatusUseCase } from '@/modules/vacancies/use-cases/vacancy-status.use-case';

@ApiTags('company-vacancies')
@ApiBearerAuth()
@Controller('company/vacancies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyVacanciesController {
  constructor(
    private readonly vacancies: CompanyVacanciesUseCase,
    private readonly status: VacancyStatusUseCase,
    private readonly questions: VacancyQuestionsUseCase,
    private readonly skills: VacancySkillsUseCase,
  ) {}

  @Get()
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Vacantes obtenidas.')
  list(
    @Query() query: ListCompanyVacanciesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ListCompanyVacanciesResult> {
    return this.vacancies.list({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...this.actor(user, client),
    });
  }

  @Post()
  @RequirePermissions('vacancies.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Vacante publicada.')
  create(
    @Body() dto: SaveVacancyDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.vacancies.create(dto, this.actor(user, client));
  }

  @Get(':id')
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Vacante obtenida.')
  get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.vacancies.get(id, this.actor(user, client));
  }

  @Put(':id')
  @RequirePermissions('vacancies.update')
  @ResponseMessage('Vacante actualizada.')
  update(
    @Param('id') id: string,
    @Body() dto: SaveVacancyDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.vacancies.update(id, dto, this.actor(user, client));
  }

  @Get(':id/questions')
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Preguntas de filtrado obtenidas.')
  listQuestions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyVacancyQuestionDto[]> {
    return this.questions.listForCompany(id, this.actor(user, client));
  }

  @Put(':id/questions')
  @RequirePermissions('vacancies.update')
  @ResponseMessage('Preguntas de filtrado actualizadas.')
  replaceQuestions(
    @Param('id') id: string,
    @Body() dto: ReplaceVacancyQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyVacancyQuestionDto[]> {
    return this.questions.replace(id, dto, this.actor(user, client));
  }

  @Patch(':id/status')
  @RequirePermissions('vacancies.status')
  @ResponseMessage('Estado de la vacante actualizado.')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeVacancyStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.status.changeStatus(id, dto.status, this.actor(user, client));
  }

  @Patch(':id/pause')
  @RequirePermissions('vacancies.status')
  @ResponseMessage('Vacante pausada.')
  pause(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.status.pause(id, this.actor(user, client));
  }

  @Patch(':id/reactivate')
  @RequirePermissions('vacancies.status')
  @ResponseMessage('Vacante reactivada.')
  reactivate(
    @Param('id') id: string,
    @Body() dto: ReactivateVacancyDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.status.reactivate(id, this.actor(user, client), dto.title);
  }

  @Patch(':id/refresh')
  @RequirePermissions('vacancies.status')
  @ResponseMessage('Vacante actualizada en el listado.')
  refresh(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyResponseDto> {
    return this.status.refresh(id, this.actor(user, client));
  }

  @Get(':id/skills')
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Skills de la vacante obtenidas.')
  listSkills(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyVacancySkillDto[]> {
    return this.skills.listForCompany(id, this.actor(user, client));
  }

  @Put(':id/skills')
  @RequirePermissions('vacancies.update')
  @ResponseMessage('Skills de la vacante actualizadas.')
  replaceSkills(
    @Param('id') id: string,
    @Body() dto: ReplaceVacancySkillsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyVacancySkillDto[]> {
    return this.skills.replace(id, dto, this.actor(user, client));
  }

  @Get('skills/search')
  @RequirePermissions('vacancies.read')
  @ResponseMessage('Skills encontradas.')
  searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<Skill[]> {
    return this.skills.searchSkills(query ?? '', limit ?? 10);
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): VacancyActor {
    return {
      userId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
