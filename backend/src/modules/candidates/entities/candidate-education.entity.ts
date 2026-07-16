import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('candidate_educations')
export class CandidateEducation extends BaseEntity {
  @Index('idx_candidate_educations_profile_id')
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({ name: 'institution_name', type: 'varchar', length: 160 })
  institutionName!: string;

  @Column({ name: 'education_level', type: 'varchar', length: 40 })
  educationLevel!: string;

  @Column({ name: 'degree_name', type: 'varchar', length: 160 })
  degreeName!: string;

  @Column({
    name: 'field_of_study',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  fieldOfStudy?: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent!: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
