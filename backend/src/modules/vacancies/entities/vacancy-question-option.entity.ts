import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Opción de una pregunta cerrada. `weight` es el corazón del scoring:
 * `-1` = excluyente (descarta la postulación), `0..10` suma al puntaje.
 * El peso jamás se expone al portal público.
 */
@Entity('vacancy_question_options')
export class VacancyQuestionOption extends BaseEntity {
  @Index('idx_vacancy_question_options_question_id')
  @Column({ name: 'question_id', type: 'varchar', length: 36 })
  questionId!: string;

  @Column({ name: 'option_text', type: 'varchar', length: 200 })
  optionText!: string;

  @Column({ name: 'weight', type: 'smallint' })
  weight!: number;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;
}
