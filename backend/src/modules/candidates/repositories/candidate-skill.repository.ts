import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { ICandidateSkillRepository } from '@/modules/candidates/repositories/candidate-skill.repository.interface';

@Injectable()
export class CandidateSkillRepository
  extends BaseRepository<CandidateSkill>
  implements ICandidateSkillRepository
{
  constructor(@InjectRepository(CandidateSkill) repo: Repository<CandidateSkill>) {
    super(repo);
  }

  findByProfileId(candidateProfileId: string): Promise<CandidateSkill[]> {
    return this.repo().find({
      where: { candidateProfileId },
      order: { createdAt: 'ASC' },
    });
  }

  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateSkill | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  countByProfileId(candidateProfileId: string): Promise<number> {
    return this.repo().count({ where: { candidateProfileId } });
  }

  save(skill: CandidateSkill, manager?: EntityManager): Promise<CandidateSkill> {
    return this.repo(manager).save(skill);
  }

  async remove(skill: CandidateSkill, manager?: EntityManager): Promise<void> {
    await this.repo(manager).remove(skill);
  }
}
