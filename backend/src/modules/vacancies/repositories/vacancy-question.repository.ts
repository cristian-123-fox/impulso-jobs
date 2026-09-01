import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { VacancyQuestion } from '@/modules/vacancies/entities/vacancy-question.entity';
import { VacancyQuestionOption } from '@/modules/vacancies/entities/vacancy-question-option.entity';
import { IVacancyQuestionRepository } from '@/modules/vacancies/repositories/vacancy-question.repository.interface';

@Injectable()
export class VacancyQuestionRepository
  extends BaseRepository<VacancyQuestion>
  implements IVacancyQuestionRepository
{
  constructor(
    @InjectRepository(VacancyQuestion)
    repo: Repository<VacancyQuestion>,
    @InjectRepository(VacancyQuestionOption)
    private readonly options: Repository<VacancyQuestionOption>,
  ) {
    super(repo);
  }

  findByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancyQuestion[]> {
    return this.repo(manager).find({
      where: { vacancyId },
      order: { sortOrder: 'ASC' },
    });
  }

  findOptionsByQuestionIds(
    questionIds: string[],
    manager?: EntityManager,
  ): Promise<VacancyQuestionOption[]> {
    if (questionIds.length === 0) return Promise.resolve([]);
    return this.optionsRepo(manager).find({
      where: { questionId: In(questionIds) },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Borrado físico: el reemplazo sólo se permite sin postulaciones previas. */
  async deleteByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const questions = await this.repo(manager).find({ where: { vacancyId } });
    const questionIds = questions.map((question) => question.id);
    if (questionIds.length > 0) {
      await this.optionsRepo(manager).delete({ questionId: In(questionIds) });
    }
    await this.repo(manager).delete({ vacancyId });
  }

  saveQuestion(
    question: VacancyQuestion,
    manager?: EntityManager,
  ): Promise<VacancyQuestion> {
    return this.repo(manager).save(question);
  }

  saveOption(
    option: VacancyQuestionOption,
    manager?: EntityManager,
  ): Promise<VacancyQuestionOption> {
    return this.optionsRepo(manager).save(option);
  }

  private optionsRepo(
    manager?: EntityManager,
  ): Repository<VacancyQuestionOption> {
    return manager
      ? manager.getRepository(VacancyQuestionOption)
      : this.options;
  }
}
