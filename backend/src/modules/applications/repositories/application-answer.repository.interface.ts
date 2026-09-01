import { EntityManager } from 'typeorm';
import { ApplicationAnswer } from '@/modules/applications/entities/application-answer.entity';

export const APPLICATION_ANSWER_REPOSITORY = 'APPLICATION_ANSWER_REPOSITORY';

export interface IApplicationAnswerRepository {
  findByApplicationId(
    applicationId: string,
    manager?: EntityManager,
  ): Promise<ApplicationAnswer[]>;
  saveMany(
    answers: ApplicationAnswer[],
    manager?: EntityManager,
  ): Promise<ApplicationAnswer[]>;
}
