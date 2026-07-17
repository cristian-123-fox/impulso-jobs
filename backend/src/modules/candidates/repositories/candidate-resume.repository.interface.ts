import { EntityManager } from 'typeorm';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';

export const CANDIDATE_RESUME_REPOSITORY = 'CANDIDATE_RESUME_REPOSITORY';

export interface ICandidateResumeRepository {
  findByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume[]>;
  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume | null>;
  countByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<number>;
  save(
    resume: CandidateResume,
    manager?: EntityManager,
  ): Promise<CandidateResume>;
  remove(resume: CandidateResume, manager?: EntityManager): Promise<void>;
  clearDefaultByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<void>;
  findLatestByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateResume | null>;
}
