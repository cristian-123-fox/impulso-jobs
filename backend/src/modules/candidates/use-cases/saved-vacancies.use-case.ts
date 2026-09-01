import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  SavedVacancyResponseDto,
  toSavedVacancyResponse,
} from '@/modules/candidates/dto/saved-vacancy-response.dto';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ISavedVacancyRepository,
  SAVED_VACANCY_REPOSITORY,
} from '@/modules/candidates/repositories/saved-vacancy.repository.interface';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

export interface SavedVacancyActor {
  userId: string;
  role: Role;
  ip: string;
  userAgent: string;
}

export interface ListSavedVacanciesCommand extends SavedVacancyActor {
  page: number;
  limit: number;
}

/**
 * T17 (fase 1): guardar vacantes. Autoservicio del aspirante sobre sus datos —
 * guardar y quitar son idempotentes (guardar dos veces devuelve la misma fila;
 * quitar lo no guardado no falla). Una vacante guardada que luego cierra se
 * conserva en la lista, marcada como inactiva.
 */
@Injectable()
export class SavedVacanciesUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(SAVED_VACANCY_REPOSITORY)
    private readonly saved: ISavedVacancyRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    private readonly audit: AuditService,
  ) {}

  /** Guarda una vacante (idempotente). Sólo se guardan vacantes activas. */
  async add(
    vacancyId: string,
    actor: SavedVacancyActor,
  ): Promise<SavedVacancyResponseDto> {
    this.assertCandidateRole(actor.role);
    const profile = await this.requireProfile(actor.userId);

    // Sólo vacantes visibles en el portal; de las demás ni se revela que existen.
    const vacancy = await this.vacancies.findPublicById(vacancyId);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no está disponible.',
      );
    }

    const existing = await this.saved.findByProfileAndVacancy(
      profile.id,
      vacancy.id,
    );
    if (existing) {
      return this.decorateOne(existing, vacancy);
    }

    const row = new SavedVacancy();
    row.candidateProfileId = profile.id;
    row.vacancyId = vacancy.id;
    const stored = await this.saved.save(row);

    await this.audit.record({
      action: 'candidate.saved_vacancies.add',
      actorUserId: actor.userId,
      entity: 'saved_vacancy',
      entityId: stored.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { vacancyId: vacancy.id },
    });

    return this.decorateOne(stored, vacancy);
  }

  /** Quita una vacante guardada (idempotente: sin fila tampoco falla). */
  async remove(vacancyId: string, actor: SavedVacancyActor): Promise<void> {
    this.assertCandidateRole(actor.role);
    const profile = await this.requireProfile(actor.userId);

    await this.saved.deleteByProfileAndVacancy(profile.id, vacancyId);

    await this.audit.record({
      action: 'candidate.saved_vacancies.remove',
      actorUserId: actor.userId,
      entity: 'saved_vacancy',
      entityId: null,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { vacancyId },
    });
  }

  async list(
    command: ListSavedVacanciesCommand,
  ): Promise<PaginatedResponse<SavedVacancyResponseDto>> {
    this.assertCandidateRole(command.role);
    const profile = await this.requireProfile(command.userId);

    const [rows, total] = await this.saved.findAndCountByProfile({
      candidateProfileId: profile.id,
      page: command.page,
      limit: command.limit,
    });

    const items = await this.decorate(rows);
    return toPaginated(items, total, command.page, command.limit);
  }

  /** Ids guardados, para pintar el estado del botón en el portal. */
  async listIds(actor: SavedVacancyActor): Promise<string[]> {
    this.assertCandidateRole(actor.role);
    const profile = await this.requireProfile(actor.userId);
    return this.saved.findVacancyIdsByProfile(profile.id);
  }

  /** Resuelve vacantes y empresas en lote, respetando la confidencialidad. */
  private async decorate(
    rows: SavedVacancy[],
  ): Promise<SavedVacancyResponseDto[]> {
    const vacancyIds = [...new Set(rows.map((row) => row.vacancyId))];
    const vacancies = await this.vacancies.findByIds(vacancyIds);
    const vacancyById = new Map<string, Vacancy>(
      vacancies.map((vacancy) => [vacancy.id, vacancy]),
    );

    const companyIds = [
      ...new Set(
        vacancies
          .filter((vacancy) => !vacancy.isConfidential)
          .map((vacancy) => vacancy.companyId),
      ),
    ];
    const companies = await this.companies.findByIds(companyIds);
    const companyById = new Map<string, Company>(
      companies.map((company) => [company.id, company]),
    );

    return rows.map((row) => {
      const vacancy = vacancyById.get(row.vacancyId) ?? null;
      const company =
        vacancy && !vacancy.isConfidential
          ? (companyById.get(vacancy.companyId) ?? null)
          : null;
      return toSavedVacancyResponse(row, vacancy, company);
    });
  }

  private async decorateOne(
    row: SavedVacancy,
    vacancy: Vacancy,
  ): Promise<SavedVacancyResponseDto> {
    const company = vacancy.isConfidential
      ? null
      : await this.companies.findById(vacancy.companyId);
    return toSavedVacancyResponse(row, vacancy, company ?? null);
  }

  private async requireProfile(userId: string): Promise<CandidateProfile> {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'No existe un perfil de candidato para este usuario.',
      );
    }
    return profile;
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden guardar vacantes.',
      );
    }
  }
}
