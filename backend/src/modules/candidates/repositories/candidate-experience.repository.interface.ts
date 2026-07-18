import { EntityManager } from 'typeorm';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';

export const CANDIDATE_EXPERIENCE_REPOSITORY =
  'CANDIDATE_EXPERIENCE_REPOSITORY';

export interface ICandidateExperienceRepository {
  findByProfileId(candidateProfileId: string): Promise<CandidateExperience[]>;
  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateExperience | null>;
  countByProfileId(candidateProfileId: string): Promise<number>;
  save(
    experience: CandidateExperience,
    manager?: EntityManager,
  ): Promise<CandidateExperience>;
  remove(
    experience: CandidateExperience,
    manager?: EntityManager,
  ): Promise<void>;
}
