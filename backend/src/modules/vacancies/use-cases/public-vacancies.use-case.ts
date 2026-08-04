import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  type IVacancyRepository,
  PublicVacancySearch,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

/**
 * Portal público de vacantes. No requiere sesión: cualquiera puede buscar
 * empleo. Sólo expone vacantes `ACTIVE` y respeta la confidencialidad — de una
 * vacante confidencial ni siquiera se consulta la empresa.
 */
@Injectable()
export class PublicVacanciesUseCase {
  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
  ) {}

  async list(
    criteria: PublicVacancySearch,
  ): Promise<PaginatedResponse<PublicVacancyResponseDto>> {
    const [rows, total] = await this.vacancies.findAndCountPublic(criteria);
    const items = await this.withCompanies(rows);
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
    const [item] = await this.withCompanies([vacancy]);
    return item;
  }

  /** Resuelve las empresas en lote, omitiendo las vacantes confidenciales. */
  private async withCompanies(
    rows: Vacancy[],
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
      ),
    );
  }
}
