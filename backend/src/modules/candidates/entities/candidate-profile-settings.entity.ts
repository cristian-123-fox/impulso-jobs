import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  InformationVisibility,
  ProfileVisibility,
} from '@/modules/candidates/enums/candidate-settings.enum';

/**
 * Configuración del candidato (M8 / HU-013). 1:1 con `candidate_profiles`.
 * Controla la visibilidad del perfil/información y la disponibilidad laboral.
 */
@Entity('candidate_profile_settings')
export class CandidateProfileSettings extends BaseEntity {
  @Index('uq_candidate_profile_settings_profile_id', { unique: true })
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({
    name: 'profile_visibility',
    type: 'varchar',
    length: 20,
    default: ProfileVisibility.PUBLIC,
  })
  profileVisibility!: ProfileVisibility;

  @Column({
    name: 'information_visibility',
    type: 'varchar',
    length: 20,
    default: InformationVisibility.FULL,
  })
  informationVisibility!: InformationVisibility;

  @Column({ name: 'is_immediately_available', type: 'boolean', default: false })
  isImmediatelyAvailable!: boolean;
}
