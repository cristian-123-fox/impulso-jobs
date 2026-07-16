import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { ICandidateLanguageRepository } from '@/modules/candidates/repositories/candidate-language.repository.interface';

@Injectable()
export class CandidateLanguageRepository
  extends BaseRepository<CandidateLanguage>
  implements ICandidateLanguageRepository
{
  constructor(
    @InjectRepository(CandidateLanguage) repo: Repository<CandidateLanguage>,
  ) {
    super(repo);
  }

  findByProfileId(candidateProfileId: string): Promise<CandidateLanguage[]> {
    return this.repo().find({
      where: { candidateProfileId },
      order: { isNative: 'DESC', createdAt: 'ASC' },
    });
  }

  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateLanguage | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  async existsByProfileIdAndLanguageCode(
    candidateProfileId: string,
    languageCode: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const where = excludeId
      ? { candidateProfileId, languageCode, id: Not(excludeId) }
      : { candidateProfileId, languageCode };
    return (await this.repo(manager).count({ where })) > 0;
  }

  countByProfileId(candidateProfileId: string): Promise<number> {
    return this.repo().count({ where: { candidateProfileId } });
  }

  save(
    language: CandidateLanguage,
    manager?: EntityManager,
  ): Promise<CandidateLanguage> {
    return this.repo(manager).save(language);
  }

  async remove(language: CandidateLanguage, manager?: EntityManager): Promise<void> {
    await this.repo(manager).remove(language);
  }
}
