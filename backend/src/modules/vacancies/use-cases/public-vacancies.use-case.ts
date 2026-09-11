import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  PublicVacancyResponseDto,
  toPublicVacancyResponse,
} from '@/modules/vacancies/dto/vacancy-response.dto';
import { PublicVacancySkillDto } from '@/modules/vacancies/dto/vacancy-skill.dto';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  type IVacancyRepository,
  PublicVacancySearch,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import {
  type IVacancyViewEventRepository,
  VACANCY_VIEW_EVENT_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';
import { VacancySkillsUseCase } from '@/modules/vacancies/use-cases/vacancy-skills.use-case';

/**
 * Portal público de vacantes. No requiere sesión: cualquiera puede buscar
 * empleo. Sólo expone vacantes `ACTIVE` y respeta la confidencialidad — de una
 * vacante confidencial ni siquiera se consulta la empresa.
 */
@Injectable()
export class PublicVacanciesUseCase {
  private readonly logger = new Logger(PublicVacanciesUseCase.name);

  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(VACANCY_VIEW_EVENT_REPOSITORY)
    private readonly viewEvents: IVacancyViewEventRepository,
    private readonly skillsUseCase: VacancySkillsUseCase,
  ) {}

  async list(
    criteria: PublicVacancySearch,
  ): Promise<PaginatedResponse<PublicVacancyResponseDto>> {
    const [rows, total] = await this.vacancies.findAndCountPublic(criteria);

    // Cargar skills en lote para todas las vacantes de la página
    const skillsByVacancy = new Map<string, PublicVacancySkillDto[]>();
    await Promise.all(
      rows.map(async (vacancy) => {
        const skills = await this.skillsUseCase.listPublic(vacancy.id);
        skillsByVacancy.set(vacancy.id, skills);
      }),
    );

    const items = await this.withCompanies(rows, skillsByVacancy);
    return toPaginated(items, total, criteria.page, criteria.limit);
  }

  async get(id: string): Promise<PublicVacancyResponseDto> {
    const vacancy = await this.vacancies.findPublicById(id);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no está disponible.',
      );
    }
    // T18: evento de vista. El contador visible se consolida una vez al día.
    this.recordView(vacancy.id);
    const skills = await this.skillsUseCase.listPublic(vacancy.id);
    const skillsMap = new Map<string, PublicVacancySkillDto[]>([
      [vacancy.id, skills],
    ]);
    const [item] = await this.withCompanies([vacancy], skillsMap);
    return item;
  }

  /** Fuego y olvido: una vista jamás debe tumbar ni retrasar el detalle. */
  private recordView(vacancyId: string): void {
    void this.viewEvents.record(vacancyId).catch((error: unknown) => {
      this.logger.warn(
        `No se pudo registrar la vista de ${vacancyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  /** Resuelve las empresas en lote, omitiendo las vacantes confidenciales. */
  private async withCompanies(
    rows: Vacancy[],
    skillsByVacancy?: Map<string, PublicVacancySkillDto[]>,
  ): Promise<PublicVacancyResponseDto[]> {
    const visibleIds = [
      ...new Set(rows.filter((v) => !v.isConfidential).map((v) => v.companyId)),
    ];
    const companies = await this.companies.findByIds(visibleIds);
    const byId = new Map<string, Company>(companies.map((c) => [c.id, c]));

    return rows.map((vacancy) =>
      toPublicVacancyResponse(
        vacancy,
        vacancy.isConfidential ? null : (byId.get(vacancy.companyId) ?? null),
        skillsByVacancy?.get(vacancy.id) ?? [],
      ),
    );
  }
}
