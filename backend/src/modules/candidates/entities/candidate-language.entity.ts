import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('candidate_languages')
@Index(
  'uq_candidate_languages_profile_language',
  ['candidateProfileId', 'languageCode'],
  {
    unique: true,
  },
)
export class CandidateLanguage extends BaseEntity {
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({ name: 'language_code', type: 'varchar', length: 10 })
  languageCode!: string;

  @Column({ type: 'varchar', length: 20 })
  level!: string;

  @Column({ name: 'is_native', type: 'boolean', default: false })
  isNative!: boolean;
}
