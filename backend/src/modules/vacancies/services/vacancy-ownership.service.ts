import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

/**
 * Resuelve y valida el contexto de empresa de quien opera sobre vacantes.
 * Concentra las dos comprobaciones que AGENTS.md exige en cada use-case:
 * la cuenta debe estar activa y la vacante debe pertenecer a su empresa.
 */
@Injectable()
export class VacancyOwnershipService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly members: ICompanyUserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
  ) {}

  /** Empresa del usuario, exigiendo cuenta activa y membresía vigente. */
  async requireCompany(userId: string): Promise<Company> {
    const user = await this.users.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.AUTH_ACCOUNT_INACTIVE,
        'Tu cuenta no está activa.',
      );
    }

    const membership = await this.members.findByUserId(userId);
    const company = membership
      ? await this.companies.findById(membership.companyId)
      : null;
    if (!company) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_NOT_FOUND,
        'Tu usuario no está asociado a ninguna empresa.',
      );
    }
    return company;
  }

  /** Vacante propia. Devuelve 404 también si es de otra empresa (no filtra). */
  async requireOwnVacancy(
    vacancyId: string,
    companyId: string,
  ): Promise<Vacancy> {
    const vacancy = await this.vacancies.findByIdAndCompany(
      vacancyId,
      companyId,
    );
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no existe.',
      );
    }
    return vacancy;
  }
}
