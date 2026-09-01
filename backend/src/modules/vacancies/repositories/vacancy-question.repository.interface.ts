import { EntityManager } from 'typeorm';
import { VacancyQuestion } from '@/modules/vacancies/entities/vacancy-question.entity';
import { VacancyQuestionOption } from '@/modules/vacancies/entities/vacancy-question-option.entity';

export const VACANCY_QUESTION_REPOSITORY = 'VACANCY_QUESTION_REPOSITORY';

export interface IVacancyQuestionRepository {
  findByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancyQuestion[]>;
  findOptionsByQuestionIds(
    questionIds: string[],
    manager?: EntityManager,
  ): Promise<VacancyQuestionOption[]>;
  deleteByVacancyId(vacancyId: string, manager?: EntityManager): Promise<void>;
  saveQuestion(
    question: VacancyQuestion,
    manager?: EntityManager,
  ): Promise<VacancyQuestion>;
  saveOption(
    option: VacancyQuestionOption,
    manager?: EntityManager,
  ): Promise<VacancyQuestionOption>;
}
