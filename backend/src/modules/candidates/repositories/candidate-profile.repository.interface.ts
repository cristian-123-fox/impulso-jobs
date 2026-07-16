import { EntityManager } from 'typeorm';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';

export const CANDIDATE_PROFILE_REPOSITORY = 'CANDIDATE_PROFILE_REPOSITORY';

export interface ICandidateProfileRepository {
  findByUserId(userId: string, manager?: EntityManager): Promise<CandidateProfile | null>;
  existsByDocumentNumber(
    documentNumber: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  save(
    profile: CandidateProfile,
    manager?: EntityManager,
  ): Promise<CandidateProfile>;
}
