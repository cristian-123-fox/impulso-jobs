import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  ApplicationStatusHistoryResponseDto,
  CandidateApplicationResponseDto,
  toApplicationStatusHistoryResponse,
  toApplicationVacancy,
  toCandidateApplicationResponse,
} from '@/modules/applications/dto/application-response.dto';
import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { INITIAL_APPLICATION_STATUS } from '@/modules/applications/enums/application-status.enum';
import {
  type IApplicationStatusHistoryRepository,
  APPLICATION_STATUS_HISTORY_REPOSITORY,
} from '@/modules/applications/repositories/application-status-history.repository.interface';
import {
  type IApplicationStatusRepository,
  APPLICATION_STATUS_REPOSITORY,
} from '@/modules/applications/repositories/application-status.repository.interface';
import {
  type ICandidateApplicationRepository,
  CANDIDATE_APPLICATION_REPOSITORY,
} from '@/modules/applications/repositories/candidate-application.repository.interface';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import {
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

export interface CandidateApplicationActor {
  userId: string;
  role: Role;
  ip: string;
  userAgent: string;
}

export interface CreateApplicationCommand extends CandidateApplicationActor {
  vacancyId: string;
  resumeId?: string;
}

export interface ListCandidateApplicationsCommand extends CandidateApplicationActor {
  statusCode?: string;
  page: number;
  limit: number;
}

/**
 * HU-012: el aspirante se postula y consulta sus procesos.
 *
 * Todo pasa por `ApplicationOwnershipService`: rol CANDIDATE, cuenta activa y
 * acceso limitado a lo suyo. Una postulación ajena responde 404, no 403, para
 * no revelar que existe.
 */
@Injectable()
export class CandidateApplicationsUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
    @Inject(APPLICATION_STATUS_REPOSITORY)
    private readonly statuses: IApplicationStatusRepository,
    @Inject(APPLICATION_STATUS_HISTORY_REPOSITORY)
    private readonly historyEntries: IApplicationStatusHistoryRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(CANDIDATE_RESUME_REPOSITORY)
    private readonly resumes: ICandidateResumeRepository,
    private readonly ownership: ApplicationOwnershipService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Postularse. La vacante debe estar activa y no puede haber una postulación
   * previa del mismo aspirante. La postulación y su primera línea de historial
   * se escriben en la misma transacción.
   */
  async apply(
    command: CreateApplicationCommand,
  ): Promise<CandidateApplicationResponseDto> {
    this.ownership.assertCandidateRole(command.role);
    const profile = await this.ownership.requireProfile(command.userId);

    const vacancy = await this.vacancies.findById(command.vacancyId);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no existe.',
      );
    }
    if (vacancy.status !== VacancyStatus.ACTIVE) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.APPLICATION_VACANCY_NOT_ACTIVE,
        'Esta vacante ya no admite postulaciones.',
      );
    }

    const alreadyApplied = await this.applications.existsByProfileAndVacancy(
      profile.id,
      vacancy.id,
    );
    if (alreadyApplied) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.APPLICATION_ALREADY_EXISTS,
        'Ya te postulaste a esta vacante.',
      );
    }

    const resumeId = await this.resolveResumeId(profile.id, command.resumeId);
    const now = new Date();

    const saved = await runInTransaction(this.dataSource, async (manager) => {
      const application = new CandidateApplication();
      application.candidateProfileId = profile.id;
      application.vacancyId = vacancy.id;
      application.companyId = vacancy.companyId;
      application.resumeId = resumeId;
      application.statusCode = INITIAL_APPLICATION_STATUS;
      application.appliedAt = now;

      const stored = await this.applications.save(application, manager);

      // Línea inicial del historial: sin estado previo.
      const entry = new ApplicationStatusHistory();
      entry.applicationId = stored.id;
      entry.previousStatusCode = null;
      entry.currentStatusCode = stored.statusCode;
      entry.changedBy = command.userId;
      entry.changedAt = now;
      await this.historyEntries.save(entry, manager);

      return stored;
    });

    await this.audit.record({
      action: 'applications.create',
      actorUserId: command.userId,
      entity: 'candidate_application',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: {
        vacancyId: vacancy.id,
        companyId: vacancy.companyId,
        statusCode: saved.statusCode,
      },
    });

    const status = await this.statuses.findByCode(saved.statusCode);
    const company = await this.companies.findById(vacancy.companyId);
    return toCandidateApplicationResponse(
      saved,
      status,
      toApplicationVacancy(vacancy, company),
    );
  }

  async list(
    command: ListCandidateApplicationsCommand,
  ): Promise<PaginatedResponse<CandidateApplicationResponseDto>> {
    this.ownership.assertCandidateRole(command.role);
    const profile = await this.ownership.requireProfile(command.userId);

    const [rows, total] = await this.applications.findAndCountByProfile({
      candidateProfileId: profile.id,
      statusCode: command.statusCode,
      page: command.page,
      limit: command.limit,
    });

    const items = await this.decorate(rows);
    return toPaginated(items, total, command.page, command.limit);
  }

  async get(
    id: string,
    actor: CandidateApplicationActor,
  ): Promise<CandidateApplicationResponseDto> {
    this.ownership.assertCandidateRole(actor.role);
    const profile = await this.ownership.requireProfile(actor.userId);
    const application = await this.ownership.requireOwnApplication(
      id,
      profile.id,
    );

    const [item] = await this.decorate([application]);
    return item;
  }

  /** Historial de estados de una postulación propia (solo lectura). */
  async listHistory(
    id: string,
    actor: CandidateApplicationActor,
  ): Promise<ApplicationStatusHistoryResponseDto[]> {
    this.ownership.assertCandidateRole(actor.role);
    const profile = await this.ownership.requireProfile(actor.userId);
    const application = await this.ownership.requireOwnApplication(
      id,
      profile.id,
    );

    const [entries, catalog] = await Promise.all([
      this.historyEntries.findByApplicationId(application.id),
      this.statuses.findAll(),
    ]);
    const byCode = new Map(catalog.map((status) => [status.code, status]));
    return entries.map((entry) =>
      toApplicationStatusHistoryResponse(entry, byCode),
    );
  }

  /**
   * Rellena vacante, empresa y estado de una página de postulaciones con tres
   * consultas por lote, en vez de una por fila.
   */
  private async decorate(
    rows: CandidateApplication[],
  ): Promise<CandidateApplicationResponseDto[]> {
    if (rows.length === 0) return [];

    const vacancyIds = [...new Set(rows.map((row) => row.vacancyId))];
    const companyIds = [...new Set(rows.map((row) => row.companyId))];

    const [vacancies, companies, catalog] = await Promise.all([
      this.vacancies.findByIds(vacancyIds),
      this.companies.findByIds(companyIds),
      this.statuses.findAll(),
    ]);

    const vacancyById = new Map(vacancies.map((item) => [item.id, item]));
    const companyById = new Map(companies.map((item) => [item.id, item]));
    const statusByCode = new Map<string, ApplicationStatus>(
      catalog.map((item) => [item.code, item]),
    );

    return rows.map((row) => {
      const vacancy = vacancyById.get(row.vacancyId);
      const company = companyById.get(row.companyId) ?? null;
      return toCandidateApplicationResponse(
        row,
        statusByCode.get(row.statusCode) ?? null,
        vacancy ? toApplicationVacancy(vacancy, company) : null,
      );
    });
  }

  /**
   * Hoja de vida a adjuntar: la indicada (validando que sea del aspirante) o,
   * si no indica ninguna, la marcada por defecto. Postular sin CV está
   * permitido: el aspirante puede no haber subido ninguna todavía.
   */
  private async resolveResumeId(
    candidateProfileId: string,
    requestedId?: string,
  ): Promise<string | null> {
    if (requestedId) {
      const resume = await this.resumes.findByIdAndProfileId(
        requestedId,
        candidateProfileId,
      );
      if (!resume) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.APPLICATION_RESUME_NOT_FOUND,
          'La hoja de vida indicada no existe.',
        );
      }
      return resume.id;
    }

    const resumes = await this.resumes.findByProfileId(candidateProfileId);
    const preferred = resumes.find((resume) => resume.isDefault) ?? resumes[0];
    return preferred?.id ?? null;
  }
}
