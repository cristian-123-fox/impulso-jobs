import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('candidate_skills')
export class CandidateSkill extends BaseEntity {
  @Index('idx_candidate_skills_profile_id')
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  level?: string | null;

  @Column({ name: 'years_experience', type: 'int', nullable: true })
  yearsExperience?: number | null;
}
