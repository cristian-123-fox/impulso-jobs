import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { ICandidateEducationRepository } from '@/modules/candidates/repositories/candidate-education.repository.interface';

@Injectable()
export class CandidateEducationRepository
  extends BaseRepository<CandidateEducation>
  implements ICandidateEducationRepository
{
  constructor(
    @InjectRepository(CandidateEducation) repo: Repository<CandidateEducation>,
  ) {
    super(repo);
  }

  findByProfileId(candidateProfileId: string): Promise<CandidateEducation[]> {
    return this.repo().find({
      where: { candidateProfileId },
      order: { isCurrent: 'DESC', startDate: 'DESC', createdAt: 'DESC' },
    });
  }

  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateEducation | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  countByProfileId(candidateProfileId: string): Promise<number> {
    return this.repo().count({ where: { candidateProfileId } });
  }

  save(
    education: CandidateEducation,
    manager?: EntityManager,
  ): Promise<CandidateEducation> {
    return this.repo(manager).save(education);
  }

  async remove(
    education: CandidateEducation,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).remove(education);
  }
}
