import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';
import { IApplicationStatusHistoryRepository } from '@/modules/applications/repositories/application-status-history.repository.interface';

@Injectable()
export class ApplicationStatusHistoryRepository
  extends BaseRepository<ApplicationStatusHistory>
  implements IApplicationStatusHistoryRepository
{
  constructor(
    @InjectRepository(ApplicationStatusHistory)
    repo: Repository<ApplicationStatusHistory>,
  ) {
    super(repo);
  }

  findByApplicationId(
    applicationId: string,
    manager?: EntityManager,
  ): Promise<ApplicationStatusHistory[]> {
    return this.repo(manager).find({
      where: { applicationId },
      order: { changedAt: 'ASC' },
    });
  }

  save(
    entry: ApplicationStatusHistory,
    manager?: EntityManager,
  ): Promise<ApplicationStatusHistory> {
    return this.repo(manager).save(entry);
  }
}
