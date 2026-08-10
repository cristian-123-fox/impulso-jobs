import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { IApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository.interface';

@Injectable()
export class ApplicationStatusRepository
  extends BaseRepository<ApplicationStatus>
  implements IApplicationStatusRepository
{
  constructor(
    @InjectRepository(ApplicationStatus) repo: Repository<ApplicationStatus>,
  ) {
    super(repo);
  }

  findAll(manager?: EntityManager): Promise<ApplicationStatus[]> {
    return this.repo(manager).find({ order: { sortOrder: 'ASC' } });
  }

  findByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<ApplicationStatus | null> {
    return this.repo(manager).findOne({ where: { code } });
  }
}
