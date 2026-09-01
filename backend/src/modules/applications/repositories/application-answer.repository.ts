import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ApplicationAnswer } from '@/modules/applications/entities/application-answer.entity';
import { IApplicationAnswerRepository } from '@/modules/applications/repositories/application-answer.repository.interface';

@Injectable()
export class ApplicationAnswerRepository
  extends BaseRepository<ApplicationAnswer>
  implements IApplicationAnswerRepository
{
  constructor(
    @InjectRepository(ApplicationAnswer)
    repo: Repository<ApplicationAnswer>,
  ) {
    super(repo);
  }

  findByApplicationId(
    applicationId: string,
    manager?: EntityManager,
  ): Promise<ApplicationAnswer[]> {
    return this.repo(manager).find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  saveMany(
    answers: ApplicationAnswer[],
    manager?: EntityManager,
  ): Promise<ApplicationAnswer[]> {
    return this.repo(manager).save(answers);
  }
}
