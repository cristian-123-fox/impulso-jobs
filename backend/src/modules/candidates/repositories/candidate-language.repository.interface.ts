import { EntityManager } from 'typeorm';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';

export const CANDIDATE_LANGUAGE_REPOSITORY = 'CANDIDATE_LANGUAGE_REPOSITORY';

export interface ICandidateLanguageRepository {
  findByProfileId(candidateProfileId: string): Promise<CandidateLanguage[]>;
  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateLanguage | null>;
  existsByProfileIdAndLanguageCode(
    candidateProfileId: string,
    languageCode: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  countByProfileId(candidateProfileId: string): Promise<number>;
  save(
    language: CandidateLanguage,
    manager?: EntityManager,
  ): Promise<CandidateLanguage>;
  remove(language: CandidateLanguage, manager?: EntityManager): Promise<void>;
}
