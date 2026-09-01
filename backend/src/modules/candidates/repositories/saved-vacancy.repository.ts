import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import {
  ISavedVacancyRepository,
  SavedVacancySearch,
} from '@/modules/candidates/repositories/saved-vacancy.repository.interface';

@Injectable()
export class SavedVacancyRepository
  extends BaseRepository<SavedVacancy>
  implements ISavedVacancyRepository
{
  constructor(
    @InjectRepository(SavedVacancy)
    repo: Repository<SavedVacancy>,
  ) {
    super(repo);
  }

  findByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<SavedVacancy | null> {
    return this.repo(manager).findOne({
      where: { candidateProfileId, vacancyId },
    });
  }

  findAndCountByProfile(
    criteria: SavedVacancySearch,
    manager?: EntityManager,
  ): Promise<[SavedVacancy[], number]> {
    return this.repo(manager).findAndCount({
      where: { candidateProfileId: criteria.candidateProfileId },
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  async findVacancyIdsByProfile(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const rows = await this.repo(manager).find({
      where: { candidateProfileId },
      select: { vacancyId: true },
    });
    return rows.map((row) => row.vacancyId);
  }

  save(saved: SavedVacancy, manager?: EntityManager): Promise<SavedVacancy> {
    return this.repo(manager).save(saved);
  }

  async deleteByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).delete({ candidateProfileId, vacancyId });
  }
}
