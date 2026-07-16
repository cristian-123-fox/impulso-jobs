import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('candidate_experiences')
export class CandidateExperience extends BaseEntity {
  @Index('idx_candidate_experiences_profile_id')
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({ name: 'job_title', type: 'varchar', length: 120 })
  jobTitle!: string;

  @Column({ name: 'company_name', type: 'varchar', length: 160 })
  companyName!: string;

  @Column({ type: 'varchar', length: 120 })
  location!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent!: boolean;

  @Column({ type: 'text', nullable: true })
  responsibilities?: string | null;
}
