import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import { ICandidateProfileSettingsRepository } from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';

@Injectable()
export class CandidateProfileSettingsRepository
  extends BaseRepository<CandidateProfileSettings>
  implements ICandidateProfileSettingsRepository
{
  constructor(
    @InjectRepository(CandidateProfileSettings)
    repo: Repository<CandidateProfileSettings>,
  ) {
    super(repo);
  }

  findByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfileSettings | null> {
    return this.repo(manager).findOne({ where: { candidateProfileId } });
  }

  save(
    settings: CandidateProfileSettings,
    manager?: EntityManager,
  ): Promise<CandidateProfileSettings> {
    return this.repo(manager).save(settings);
  }
}
