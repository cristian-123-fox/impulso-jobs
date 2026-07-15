import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';

@Injectable()
export class CandidateProfileRepository
  extends BaseRepository<CandidateProfile>
  implements ICandidateProfileRepository
{
  constructor(
    @InjectRepository(CandidateProfile) repo: Repository<CandidateProfile>,
  ) {
    super(repo);
  }

  async existsByDocumentNumber(
    documentNumber: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    return (await this.repo(manager).count({ where: { documentNumber } })) > 0;
  }

  save(
    profile: CandidateProfile,
    manager?: EntityManager,
  ): Promise<CandidateProfile> {
    return this.repo(manager).save(profile);
  }
}
