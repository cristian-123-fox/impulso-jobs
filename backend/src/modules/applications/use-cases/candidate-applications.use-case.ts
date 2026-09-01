import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { toDateOnly, todayAsDateOnly } from '@/common/utils/date-only.util';
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
import { ApplicationAnswer } from '@/modules/applications/entities/application-answer.entity';
import {
  type IApplicationAnswerRepository,
  APPLICATION_ANSWER_REPOSITORY,
} from '@/modules/applications/repositories/application-answer.repository.interface';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import {
  type IApplicationResumeSnapshotStorage,
  APPLICATION_RESUME_SNAPSHOT_STORAGE,
} from '@/modules/applications/services/application-resume-snapshot-storage.port';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import {
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ICandidateResumeStorage,
  CANDIDATE_RESUME_STORAGE,
} from '@/modules/candidates/services/candidate-resume-storage.port';
import {
  EXCLUDING_WEIGHT,
  VacancyQuestionType,
} from '@/modules/vacancies/enums/vacancy-question.enums';
import {
  type IVacancyQuestionRepository,
  VACANCY_QUESTION_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-question.repository.interface';
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

export interface CreateApplicationAnswerInput {
  questionId: string;
  optionId?: string;
  answerText?: string;
}

export interface CreateApplicationCommand extends CandidateApplicationActor {
  vacancyId: string;
  resumeId?: string;
  answers?: CreateApplicationAnswerInput[];
}

interface ScreeningResult {
  score: number | null;
  isExcluded: boolean;
  /** Respuestas listas para persistir; `applicationId` se fija al guardar. */
  answers: ApplicationAnswer[];
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
  private readonly logger = new Logger(CandidateApplicationsUseCase.name);

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
    @Inject(CANDIDATE_RESUME_STORAGE)
    private readonly resumeStorage: ICandidateResumeStorage,
    @Inject(APPLICATION_RESUME_SNAPSHOT_STORAGE)
    private readonly snapshotStorage: IApplicationResumeSnapshotStorage,
    @Inject(VACANCY_QUESTION_REPOSITORY)
    private readonly questions: IVacancyQuestionRepository,
    @Inject(APPLICATION_ANSWER_REPOSITORY)
    private readonly answers: IApplicationAnswerRepository,
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
    // La fecha límite es inclusiva: el día señalado todavía se puede postular.
    const deadline = toDateOnly(vacancy.applicationDeadline);
    if (deadline && deadline < todayAsDateOnly()) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.APPLICATION_VACANCY_NOT_ACTIVE,
        'La fecha límite para postularse a esta vacante ya pasó.',
      );
    }
    // Vigencia (T20): cubre la ventana entre el vencimiento y la corrida del
    // job `vacancies:expire`, que es quien la cierra de verdad.
    if (vacancy.expiresAt && vacancy.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.APPLICATION_VACANCY_NOT_ACTIVE,
        'Esta vacante ya venció.',
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

    const resume = await this.resolveResume(profile.id, command.resumeId);
    const screening = await this.resolveScreening(
      vacancy.id,
      command.answers ?? [],
    );
    const now = new Date();

    // T19: el id se genera aquí para poder nombrar el snapshot del CV, que se
    // escribe en disco ANTES de la transacción (los archivos no participan en
    // el rollback; si la transacción falla, el snapshot huérfano se borra).
    const applicationId = randomUUID();
    const snapshot = await this.snapshotResume(applicationId, resume);

    let saved: CandidateApplication;
    try {
      saved = await runInTransaction(this.dataSource, async (manager) => {
        const application = new CandidateApplication();
        application.id = applicationId;
        application.candidateProfileId = profile.id;
        application.vacancyId = vacancy.id;
        application.companyId = vacancy.companyId;
        application.resumeId = resume?.id ?? null;
        application.resumeSnapshotKey = snapshot?.storageKey ?? null;
        application.resumeSnapshotName = snapshot?.fileName ?? null;
        application.resumeSnapshotMime = snapshot?.mimeType ?? null;
        application.statusCode = INITIAL_APPLICATION_STATUS;
        application.appliedAt = now;
        application.score = screening.score;
        application.isExcluded = screening.isExcluded;

        const stored = await this.applications.save(application, manager);

        if (screening.answers.length > 0) {
          screening.answers.forEach((answer) => {
            answer.applicationId = stored.id;
          });
          await this.answers.saveMany(screening.answers, manager);
        }

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
    } catch (error) {
      if (snapshot) await this.safeDeleteSnapshot(snapshot.storageKey);
      throw error;
    }

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
  /**
   * Cruza las respuestas con las preguntas de la vacante (M15) y calcula el
   * puntaje: cada opción suma su peso; una opción excluyente (-1) descarta la
   * postulación sin sumar. Todas las preguntas son obligatorias.
   */
  private async resolveScreening(
    vacancyId: string,
    provided: CreateApplicationAnswerInput[],
  ): Promise<ScreeningResult> {
    const questions = await this.questions.findByVacancyId(vacancyId);
    if (questions.length === 0) {
      return { score: null, isExcluded: false, answers: [] };
    }

    const options = await this.questions.findOptionsByQuestionIds(
      questions.map((question) => question.id),
    );
    const optionsByQuestion = new Map<string, typeof options>();
    for (const option of options) {
      const list = optionsByQuestion.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestion.set(option.questionId, list);
    }
    const givenByQuestion = new Map(
      provided.map((answer) => [answer.questionId, answer]),
    );

    const answers: ApplicationAnswer[] = [];
    let score = 0;
    let isExcluded = false;

    for (const question of questions) {
      const given = givenByQuestion.get(question.id);
      if (!given) {
        throw this.invalidAnswers(
          'Debes responder todas las preguntas de la vacante.',
        );
      }

      const answer = new ApplicationAnswer();
      answer.questionId = question.id;
      answer.questionText = question.questionText;

      if (question.questionType === VacancyQuestionType.CLOSED) {
        const option = (optionsByQuestion.get(question.id) ?? []).find(
          (item) => item.id === given.optionId,
        );
        if (!option) {
          throw this.invalidAnswers(
            'Selecciona una opción válida en cada pregunta.',
          );
        }
        answer.optionId = option.id;
        answer.answerText = option.optionText;
        answer.weight = option.weight;
        if (option.weight === EXCLUDING_WEIGHT) {
          isExcluded = true;
        } else {
          score += option.weight;
        }
      } else {
        const text = given.answerText?.trim();
        if (!text) {
          throw this.invalidAnswers(
            'Escribe una respuesta en las preguntas abiertas.',
          );
        }
        answer.optionId = null;
        answer.answerText = text;
        answer.weight = null;
      }

      answers.push(answer);
    }

    return { score, isExcluded, answers };
  }

  private invalidAnswers(message: string): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.APPLICATION_ANSWERS_INVALID,
      message,
    );
  }

  private async resolveResume(
    candidateProfileId: string,
    requestedId?: string,
  ): Promise<CandidateResume | null> {
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
      return resume;
    }

    const resumes = await this.resumes.findByProfileId(candidateProfileId);
    return resumes.find((resume) => resume.isDefault) ?? resumes[0] ?? null;
  }

  /**
   * T19: congela una copia del CV para la postulación. Es best-effort — si la
   * copia falla, la postulación sigue adelante con la FK viva (el comportamiento
   * previo a T19): postularse es lo crítico, el snapshot es una garantía extra.
   */
  private async snapshotResume(
    applicationId: string,
    resume: CandidateResume | null,
  ): Promise<{
    storageKey: string;
    fileName: string;
    mimeType: string;
  } | null> {
    if (!resume) return null;
    try {
      const stream = await this.resumeStorage.openReadStream(resume.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const { storageKey } = await this.snapshotStorage.save(
        applicationId,
        Buffer.concat(chunks),
      );
      return {
        storageKey,
        fileName: resume.fileName,
        mimeType: resume.mimeType,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo congelar el CV ${resume.id} para la postulación ${applicationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /** Mejor un archivo huérfano que un doble fallo al deshacer. */
  private async safeDeleteSnapshot(storageKey: string): Promise<void> {
    try {
      await this.snapshotStorage.delete(storageKey);
    } catch {
      this.logger.warn(`Snapshot huérfano sin borrar: ${storageKey}`);
    }
  }
}
