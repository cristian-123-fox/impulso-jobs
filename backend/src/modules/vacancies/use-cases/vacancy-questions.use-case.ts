import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import {
  CompanyVacancyQuestionDto,
  PublicVacancyQuestionDto,
  ReplaceVacancyQuestionsDto,
  SaveVacancyQuestionDto,
  toCompanyVacancyQuestion,
  toPublicVacancyQuestion,
} from '@/modules/vacancies/dto/vacancy-question.dto';
import { VacancyQuestion } from '@/modules/vacancies/entities/vacancy-question.entity';
import { VacancyQuestionOption } from '@/modules/vacancies/entities/vacancy-question-option.entity';
import {
  MAX_OPTIONS_PER_QUESTION,
  MIN_OPTIONS_PER_QUESTION,
  VacancyQuestionType,
} from '@/modules/vacancies/enums/vacancy-question.enums';
import {
  type IVacancyQuestionRepository,
  VACANCY_QUESTION_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-question.repository.interface';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface VacancyQuestionActor {
  userId: string;
  ip: string;
  userAgent: string;
}

/**
 * M15: preguntas de filtrado (killer questions) de una vacante.
 *
 * La capacidad la otorga el plan (`screening_enabled`, ver EntitlementService).
 * Las preguntas se congelan en cuanto llega la primera postulación: cambiar el
 * cuestionario a mitad del proceso invalidaría los puntajes ya calculados.
 */
@Injectable()
export class VacancyQuestionsUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(VACANCY_QUESTION_REPOSITORY)
    private readonly questions: IVacancyQuestionRepository,
    @Inject(VACANCY_REPOSITORY)
    private readonly vacancies: IVacancyRepository,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async listForCompany(
    vacancyId: string,
    actor: VacancyQuestionActor,
  ): Promise<CompanyVacancyQuestionDto[]> {
    const company = await this.ownership.requireCompany(actor.userId);
    await this.ownership.requireOwnVacancy(vacancyId, company.id);
    return this.loadCompanyQuestions(vacancyId);
  }

  async replace(
    vacancyId: string,
    dto: ReplaceVacancyQuestionsDto,
    actor: VacancyQuestionActor,
  ): Promise<CompanyVacancyQuestionDto[]> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(
      vacancyId,
      company.id,
    );

    if (!vacancy.screeningEnabled) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.VACANCY_SCREENING_NOT_ENABLED,
        'Las preguntas de filtrado son un beneficio del plan contratado.',
      );
    }

    const applications = await this.dataSource
      .getRepository(CandidateApplication)
      .count({ where: { vacancyId } });
    if (applications > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_SCREENING_LOCKED,
        'La vacante ya tiene postulaciones: las preguntas no pueden cambiarse.',
      );
    }

    dto.questions.forEach((question) => this.assertQuestionShape(question));

    await runInTransaction(this.dataSource, async (manager) => {
      await this.questions.deleteByVacancyId(vacancyId, manager);
      for (const [index, item] of dto.questions.entries()) {
        const question = Object.assign(new VacancyQuestion(), {
          vacancyId,
          questionText: item.questionText.trim(),
          questionType: item.questionType,
          sortOrder: index,
        });
        const saved = await this.questions.saveQuestion(question, manager);

        if (item.questionType === VacancyQuestionType.CLOSED) {
          for (const [optionIndex, optionItem] of (
            item.options ?? []
          ).entries()) {
            await this.questions.saveOption(
              Object.assign(new VacancyQuestionOption(), {
                questionId: saved.id,
                optionText: optionItem.optionText.trim(),
                weight: optionItem.weight,
                sortOrder: optionIndex,
              }),
              manager,
            );
          }
        }
      }
    });

    await this.audit.record({
      action: 'vacancies.questions.update',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: vacancyId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { total: dto.questions.length },
    });

    return this.loadCompanyQuestions(vacancyId);
  }

  /** Preguntas visibles en el portal: sólo de vacantes activas y sin pesos. */
  async listPublic(vacancyId: string): Promise<PublicVacancyQuestionDto[]> {
    const vacancy = await this.vacancies.findPublicById(vacancyId);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no está disponible.',
      );
    }
    const questions = await this.questions.findByVacancyId(vacancyId);
    const options = await this.questions.findOptionsByQuestionIds(
      questions.map((question) => question.id),
    );
    const byQuestion = this.groupOptions(options);
    return questions.map((question) =>
      toPublicVacancyQuestion(question, byQuestion.get(question.id) ?? []),
    );
  }

  private async loadCompanyQuestions(
    vacancyId: string,
  ): Promise<CompanyVacancyQuestionDto[]> {
    const questions = await this.questions.findByVacancyId(vacancyId);
    const options = await this.questions.findOptionsByQuestionIds(
      questions.map((question) => question.id),
    );
    const byQuestion = this.groupOptions(options);
    return questions.map((question) =>
      toCompanyVacancyQuestion(question, byQuestion.get(question.id) ?? []),
    );
  }

  private groupOptions(
    options: VacancyQuestionOption[],
  ): Map<string, VacancyQuestionOption[]> {
    const byQuestion = new Map<string, VacancyQuestionOption[]>();
    for (const option of options) {
      const list = byQuestion.get(option.questionId) ?? [];
      list.push(option);
      byQuestion.set(option.questionId, list);
    }
    return byQuestion;
  }

  /** Reglas que class-validator no cubre: cardinalidad de opciones por tipo. */
  private assertQuestionShape(question: SaveVacancyQuestionDto): void {
    const options = question.options ?? [];
    if (question.questionType === VacancyQuestionType.CLOSED) {
      if (
        options.length < MIN_OPTIONS_PER_QUESTION ||
        options.length > MAX_OPTIONS_PER_QUESTION
      ) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          'Una pregunta cerrada necesita entre 2 y 5 opciones.',
        );
      }
    } else if (options.length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Una pregunta abierta no lleva opciones.',
      );
    }
  }
}
