import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { PublicVacancyQuestionDto } from '@/modules/vacancies/dto/vacancy-question.dto';
import { PublicVacancyResponseDto } from '@/modules/vacancies/dto/vacancy-response.dto';
import { ListPublicVacanciesQueryDto } from '@/modules/vacancies/dto/vacancy.dto';
import { PublicVacanciesUseCase } from '@/modules/vacancies/use-cases/public-vacancies.use-case';
import { VacancyQuestionsUseCase } from '@/modules/vacancies/use-cases/vacancy-questions.use-case';

/**
 * Portal de empleo. Deliberadamente **sin guards**: buscar vacantes no exige
 * cuenta. El permiso `vacancies.read.public` de la matriz cubre el acceso
 * autenticado a este mismo contenido desde el panel.
 */
@ApiTags('vacancies')
@Controller('vacancies')
export class PublicVacanciesController {
  constructor(
    private readonly vacancies: PublicVacanciesUseCase,
    private readonly questions: VacancyQuestionsUseCase,
  ) {}

  @Get()
  @ResponseMessage('Vacantes obtenidas.')
  list(
    @Query() query: ListPublicVacanciesQueryDto,
  ): Promise<PaginatedResponse<PublicVacancyResponseDto>> {
    return this.vacancies.list({
      search: query.search,
      state: query.state,
      municipality: query.municipality,
      employmentType: query.employmentType,
      workMode: query.workMode,
      experienceLevel: query.experienceLevel,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get(':id')
  @ResponseMessage('Vacante obtenida.')
  get(@Param('id') id: string): Promise<PublicVacancyResponseDto> {
    return this.vacancies.get(id);
  }

  /** Preguntas de filtrado para el flujo de postulación. Nunca expone pesos. */
  @Get(':id/questions')
  @ResponseMessage('Preguntas obtenidas.')
  listQuestions(@Param('id') id: string): Promise<PublicVacancyQuestionDto[]> {
    return this.questions.listPublic(id);
  }
}
