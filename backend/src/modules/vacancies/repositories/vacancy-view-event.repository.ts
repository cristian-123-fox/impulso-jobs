import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { VacancyViewEvent } from '@/modules/vacancies/entities/vacancy-view-event.entity';
import {
  IVacancyViewEventRepository,
  VacancyViewGroup,
} from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';

@Injectable()
export class VacancyViewEventRepository
  extends BaseRepository<VacancyViewEvent>
  implements IVacancyViewEventRepository
{
  constructor(
    @InjectRepository(VacancyViewEvent)
    repo: Repository<VacancyViewEvent>,
  ) {
    super(repo);
  }

  async record(vacancyId: string, manager?: EntityManager): Promise<void> {
    const event = new VacancyViewEvent();
    event.vacancyId = vacancyId;
    await this.repo(manager).save(event);
  }

  async countGroupedUntil(
    cutoff: Date,
    manager?: EntityManager,
  ): Promise<VacancyViewGroup[]> {
    // Nombres de columna en crudo: idénticos en PostgreSQL y MySQL.
    const rows = await this.repo(manager)
      .createQueryBuilder('event')
      .select('event.vacancy_id', 'vacancyId')
      .addSelect('COUNT(*)', 'views')
      .where('event.created_at <= :cutoff', { cutoff })
      .groupBy('event.vacancy_id')
      .getRawMany<{ vacancyId: string; views: string | number }>();

    return rows.map((row) => ({
      vacancyId: row.vacancyId,
      views: Number(row.views),
    }));
  }

  async deleteUntil(cutoff: Date, manager?: EntityManager): Promise<void> {
    await this.repo(manager)
      .createQueryBuilder()
      .delete()
      .where('created_at <= :cutoff', { cutoff })
      .execute();
  }
}
