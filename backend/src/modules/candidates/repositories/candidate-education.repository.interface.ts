import { EntityManager } from 'typeorm';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';

export const CANDIDATE_EDUCATION_REPOSITORY = 'CANDIDATE_EDUCATION_REPOSITORY';

export interface ICandidateEducationRepository {
  findByProfileId(candidateProfileId: string): Promise<CandidateEducation[]>;
  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateEducation | null>;
  countByProfileId(candidateProfileId: string): Promise<number>;
  save(
    education: CandidateEducation,
    manager?: EntityManager,
  ): Promise<CandidateEducation>;
  remove(education: CandidateEducation, manager?: EntityManager): Promise<void>;
}
