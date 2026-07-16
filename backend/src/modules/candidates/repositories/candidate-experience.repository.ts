import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { ICandidateExperienceRepository } from '@/modules/candidates/repositories/candidate-experience.repository.interface';

@Injectable()
export class CandidateExperienceRepository
  extends BaseRepository<CandidateExperience>
  implements ICandidateExperienceRepository
{
  constructor(
    @InjectRepository(CandidateExperience) repo: Repository<CandidateExperience>,
  ) {
    super(repo);
  }

  findByProfileId(candidateProfileId: string): Promise<CandidateExperience[]> {
    return this.repo().find({
      where: { candidateProfileId },
      order: { isCurrent: 'DESC', startDate: 'DESC', createdAt: 'DESC' },
    });
  }

  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateExperience | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  countByProfileId(candidateProfileId: string): Promise<number> {
    return this.repo().count({ where: { candidateProfileId } });
  }

  save(
    experience: CandidateExperience,
    manager?: EntityManager,
  ): Promise<CandidateExperience> {
    return this.repo(manager).save(experience);
  }

  async remove(
    experience: CandidateExperience,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).remove(experience);
  }
}
