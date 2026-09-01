import { ReadStream } from 'node:fs';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import {
  type ICandidateResumeStorage,
  CANDIDATE_RESUME_STORAGE,
} from '@/modules/candidates/services/candidate-resume-storage.port';
import {
  ApplicationAnswerResponseDto,
  ApplicationStatusHistoryResponseDto,
  ApplicationStatusResponseDto,
  CompanyApplicationResponseDto,
  toApplicationAnswerResponse,
  toApplicationCandidate,
  toApplicationResume,
  toApplicationStatusHistoryResponse,
  toApplicationStatusResponse,
  toApplicationVacancy,
  toCompanyApplicationResponse,
} from '@/modules/applications/dto/application-response.dto';
import {
  type IApplicationAnswerRepository,
  APPLICATION_ANSWER_REPOSITORY,
} from '@/modules/applications/repositories/application-answer.repository.interface';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
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
  type IApplicationResumeSnapshotStorage,
  APPLICATION_RESUME_SNAPSHOT_STORAGE,
} from '@/modules/applications/services/application-resume-snapshot-storage.port';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface CompanyApplicationActor {
  userId: string;
  ip: string;
  userAgent: string;
}

export interface ListCompanyApplicationsCommand extends CompanyApplicationActor {
  vacancyId?: string;
  statusCode?: string;
  page: number;
  limit: number;
}

/** Conteo por estado del embudo, para las tarjetas del listado. */
export type CompanyApplicationStats = Record<string, number>;

export interface ListCompanyApplicationsResult extends PaginatedResponse<CompanyApplicationResponseDto> {
  stats: CompanyApplicationStats;
  /** Postulaciones que ningún reclutador ha abierto (respeta el filtro de vacante). */
  unread: number;
}

/**
 * HU-015: la empresa consulta y gestiona las postulaciones a sus vacantes.
 *
 * La empresa se resuelve con `VacancyOwnershipService` (M10) y toda consulta
 * se acota por `company_id`; una postulación de otra empresa responde 404.
 */
@Injectable()
export class CompanyApplicationsUseCase {
  constructor(
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
    @Inject(APPLICATION_STATUS_REPOSITORY)
    private readonly statuses: IApplicationStatusRepository,
    @Inject(APPLICATION_STATUS_HISTORY_REPOSITORY)
    private readonly historyEntries: IApplicationStatusHistoryRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_RESUME_REPOSITORY)
    private readonly resumes: ICandidateResumeRepository,
    @Inject(CANDIDATE_RESUME_STORAGE)
    private readonly resumeStorage: ICandidateResumeStorage,
    @Inject(APPLICATION_RESUME_SNAPSHOT_STORAGE)
    private readonly snapshotStorage: IApplicationResumeSnapshotStorage,
    @Inject(APPLICATION_ANSWER_REPOSITORY)
    private readonly answers: IApplicationAnswerRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly companyOwnership: VacancyOwnershipService,
    private readonly ownership: ApplicationOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async list(
    command: ListCompanyApplicationsCommand,
  ): Promise<ListCompanyApplicationsResult> {
    const company = await this.companyOwnership.requireCompany(command.userId);

    // Filtrar por una vacante ajena no debe filtrar datos: se valida antes.
    if (command.vacancyId) {
      await this.companyOwnership.requireOwnVacancy(
        command.vacancyId,
        company.id,
      );
    }

    const [rows, total] = await this.applications.findAndCountByCompany({
      companyId: company.id,
      vacancyId: command.vacancyId,
      statusCode: command.statusCode,
      page: command.page,
      limit: command.limit,
    });

    const [items, stats, unread] = await Promise.all([
      this.decorate(rows),
      this.applications.countByCompanyGroupedByStatus(
        company.id,
        command.vacancyId,
      ),
      this.applications.countUnreadByCompany(company.id, command.vacancyId),
    ]);

    return {
      ...toPaginated(items, total, command.page, command.limit),
      stats,
      unread,
    };
  }

  async get(
    id: string,
    actor: CompanyApplicationActor,
  ): Promise<CompanyApplicationResponseDto> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    const application = await this.ownership.requireCompanyApplication(
      id,
      company.id,
    );
    await this.markRead(application);

    const [item] = await this.decorate([application]);
    return item;
  }

  /** Respuestas de filtrado de la postulación (M15). */
  async listAnswers(
    id: string,
    actor: CompanyApplicationActor,
  ): Promise<ApplicationAnswerResponseDto[]> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    const application = await this.ownership.requireCompanyApplication(
      id,
      company.id,
    );
    await this.markRead(application);

    const answers = await this.answers.findByApplicationId(application.id);
    return answers.map(toApplicationAnswerResponse);
  }

  async listHistory(
    id: string,
    actor: CompanyApplicationActor,
  ): Promise<ApplicationStatusHistoryResponseDto[]> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    const application = await this.ownership.requireCompanyApplication(
      id,
      company.id,
    );
    await this.markRead(application);

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
   * Descarga del CV adjunto a una postulación de la empresa. El acceso ya está
   * acotado por ownership (`company_id`); el archivo baja por el mismo storage
   * privado de los CV (nunca por el área pública de /uploads).
   */
  async getResumeDownload(
    id: string,
    actor: CompanyApplicationActor,
  ): Promise<{ fileName: string; mimeType: string; stream: ReadStream }> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    const application = await this.ownership.requireCompanyApplication(
      id,
      company.id,
    );

    await this.markRead(application);

    // T19: se prefiere el snapshot congelado al postular — es lo que la
    // empresa evaluó, aunque el candidato haya borrado o reemplazado su CV.
    if (application.resumeSnapshotKey) {
      try {
        const stream = await this.snapshotStorage.openReadStream(
          application.resumeSnapshotKey,
        );
        await this.auditResumeDownload(application, actor, true);
        return {
          fileName: application.resumeSnapshotName ?? 'hoja-de-vida.pdf',
          mimeType: application.resumeSnapshotMime ?? 'application/pdf',
          stream,
        };
      } catch {
        // Snapshot ilegible: se intenta la FK viva antes de rendirse.
      }
    }

    // Postulaciones previas a T19 (o snapshot perdido): la FK viva.
    const resume = application.resumeId
      ? await this.resumes.findByIdAndProfileId(
          application.resumeId,
          application.candidateProfileId,
        )
      : null;
    if (!resume) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.APPLICATION_RESUME_NOT_FOUND,
        'La postulación no tiene hoja de vida adjunta.',
      );
    }

    try {
      const stream = await this.resumeStorage.openReadStream(resume.storageKey);
      await this.auditResumeDownload(application, actor, false, resume);
      return { fileName: resume.fileName, mimeType: resume.mimeType, stream };
    } catch {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESUME_FILE_NOT_FOUND,
        'No fue posible descargar la hoja de vida.',
      );
    }
  }

  private auditResumeDownload(
    application: CandidateApplication,
    actor: CompanyApplicationActor,
    fromSnapshot: boolean,
    resume?: CandidateResume,
  ): Promise<void> {
    return this.audit.record({
      action: 'company.application.resume.download',
      actorUserId: actor.userId,
      entity: 'candidate_application',
      entityId: application.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        fromSnapshot,
        resumeId: resume?.id ?? application.resumeId,
        fileName: fromSnapshot
          ? (application.resumeSnapshotName ?? null)
          : (resume?.fileName ?? null),
      },
    });
  }

  /**
   * Cualquier interacción de la empresa con la postulación (detalle, historial,
   * respuestas, CV o cambio de estado) la marca como leída. Es a nivel empresa.
   */
  private async markRead(application: CandidateApplication): Promise<void> {
    if (application.readAt) return;
    application.readAt = new Date();
    await this.applications.save(application);
  }

  /** Catálogo de estados disponibles para el selector del reclutador. */
  async listStatuses(
    actor: CompanyApplicationActor,
  ): Promise<ApplicationStatusResponseDto[]> {
    await this.companyOwnership.requireCompany(actor.userId);
    const catalog = await this.statuses.findAll();
    return catalog.map(toApplicationStatusResponse);
  }

  /**
   * Rellena aspirante, contacto, vacante y hoja de vida por lote. El contacto
   * del postulado se incluye siempre: todos los planes de pago lo cubren
   * (`Impulso_Jobs_Planes_Suscripciones.md`). Lo condicionado al plan es la
   * base de talento (M12/M14), que no pasa por aquí.
   */
  private async decorate(
    rows: CandidateApplication[],
  ): Promise<CompanyApplicationResponseDto[]> {
    if (rows.length === 0) return [];

    const vacancyIds = [...new Set(rows.map((row) => row.vacancyId))];
    const companyIds = [...new Set(rows.map((row) => row.companyId))];
    const profileIds = [...new Set(rows.map((row) => row.candidateProfileId))];

    const [vacancies, companies, profiles, catalog] = await Promise.all([
      this.vacancies.findByIds(vacancyIds),
      this.companies.findByIds(companyIds),
      this.profiles.findByIds(profileIds),
      this.statuses.findAll(),
    ]);

    const users = await this.users.findByIds(
      profiles.map((profile) => profile.userId),
    );

    const vacancyById = new Map(vacancies.map((item) => [item.id, item]));
    const companyById = new Map(companies.map((item) => [item.id, item]));
    const profileById = new Map(profiles.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));
    const statusByCode = new Map<string, ApplicationStatus>(
      catalog.map((item) => [item.code, item]),
    );

    // Las hojas de vida se piden una a una: sólo las de esta página y cada una
    // debe validarse contra su propio perfil.
    const resumes = await Promise.all(
      rows.map((row) =>
        row.resumeId
          ? this.resumes.findByIdAndProfileId(
              row.resumeId,
              row.candidateProfileId,
            )
          : Promise.resolve(null),
      ),
    );

    return rows.map((row, index) => {
      const vacancy = vacancyById.get(row.vacancyId);
      const company = companyById.get(row.companyId) ?? null;
      const profile = profileById.get(row.candidateProfileId);
      const resume = resumes[index];

      return toCompanyApplicationResponse(
        row,
        statusByCode.get(row.statusCode) ?? null,
        profile
          ? toApplicationCandidate(
              profile,
              userById.get(profile.userId) ?? null,
            )
          : null,
        vacancy ? toApplicationVacancy(vacancy, company, true) : null,
        resume ? toApplicationResume(resume) : null,
      );
    });
  }
}
