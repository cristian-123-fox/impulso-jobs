import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Catálogo normalizado de habilidades (skills). El slug es único y se genera
 * a partir del name en minúsculas y sin espacios especiales.
 *
 * Se pobla gradualmente: el autocomplete permite crear nuevas skills cuando
 * el candidato o empresa las escriben.
 */
@Entity('skills')
export class Skill extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Index('idx_skills_slug_unique', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  slug!: string;
}
