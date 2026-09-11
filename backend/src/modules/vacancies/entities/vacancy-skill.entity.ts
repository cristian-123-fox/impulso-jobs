import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Relación vacante ↔ skill (T25). Cada vacante puede requerir N skills,
 * y cada skill puede estar en M vacantes.
 *
 * `is_required` indica si la skill es obligatoria o deseable.
 * `sort_order` controla el orden de presentación en el portal.
 */
@Entity('vacancy_skills')
export class VacancySkill extends BaseEntity {
  @Index('idx_vacancy_skills_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;

  @Index('idx_vacancy_skills_skill_id')
  @Column({ name: 'skill_id', type: 'varchar', length: 36 })
  skillId!: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;
}
