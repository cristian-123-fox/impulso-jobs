import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import {
  IVacancyReportRepository,
  VacancyReportSearch,
} from '@/modules/vacancies/repositories/vacancy-report.repository.interface';

@Injectable()
export class VacancyReportRepository
  extends BaseRepository<VacancyReport>
  implements IVacancyReportRepository
{
  constructor(
    @InjectRepository(VacancyReport)
    repo: Repository<VacancyReport>,
  ) {
    super(repo);
  }

  async existsByVacancyAndReporter(
    vacancyId: string,
    reporterUserId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const total = await this.repo(manager).count({
      where: { vacancyId, reporterUserId },
    });
    return total > 0;
  }

  findById(id: string, manager?: EntityManager): Promise<VacancyReport | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  findAndCount(
    criteria: VacancyReportSearch,
    manager?: EntityManager,
  ): Promise<[VacancyReport[], number]> {
    const where: FindOptionsWhere<VacancyReport> = {};
    if (criteria.status) where.status = criteria.status;
    return this.repo(manager).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  save(report: VacancyReport, manager?: EntityManager): Promise<VacancyReport> {
    return this.repo(manager).save(report);
  }
}
