import { EntityManager } from 'typeorm';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';

export const CANDIDATE_SKILL_REPOSITORY = 'CANDIDATE_SKILL_REPOSITORY';

export interface ICandidateSkillRepository {
  findByProfileId(candidateProfileId: string): Promise<CandidateSkill[]>;
  findByIdAndProfileId(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateSkill | null>;
  countByProfileId(candidateProfileId: string): Promise<number>;
  save(skill: CandidateSkill, manager?: EntityManager): Promise<CandidateSkill>;
  remove(skill: CandidateSkill, manager?: EntityManager): Promise<void>;
}
