import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { ICandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository.interface';

@Injectable()
export class CandidateResumeRepository
  extends BaseRepository<CandidateResume>
  implements ICandidateResumeRepository
{
  constructor(
    @InjectRepository(CandidateResume) repo: Repository<CandidateResume>,
  ) {
    super(repo);
  }

  findByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume[]> {
    return this.repo(manager).find({
      where: { candidateProfileId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  countByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count({ where: { candidateProfileId } });
  }

  save(
    resume: CandidateResume,
    manager?: EntityManager,
  ): Promise<CandidateResume> {
    return this.repo(manager).save(resume);
  }

  async remove(resume: CandidateResume, manager?: EntityManager): Promise<void> {
    await this.repo(manager).remove(resume);
  }

  async clearDefaultByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).update({ candidateProfileId }, { isDefault: false });
  }

  findLatestByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume | null> {
    return this.repo(manager).findOne({
      where: { candidateProfileId },
      order: { createdAt: 'DESC' },
    });
  }
}
