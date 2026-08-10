import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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

  findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfile | null> {
    return this.repo(manager).findOne({ where: { userId } });
  }

  findByUserIds(
    userIds: string[],
    manager?: EntityManager,
  ): Promise<CandidateProfile[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { userId: In(userIds) } });
  }

  findByIds(
    ids: string[],
    manager?: EntityManager,
  ): Promise<CandidateProfile[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { id: In(ids) } });
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
