import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { VacancyQuestionType } from '@/modules/vacancies/enums/vacancy-question.enums';

/** Pregunta de filtrado (killer question) de una vacante. Máximo 5 (M15). */
@Entity('vacancy_questions')
export class VacancyQuestion extends BaseEntity {
  @Index('idx_vacancy_questions_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;

  @Column({ name: 'question_text', type: 'varchar', length: 200 })
  questionText!: string;

  @Column({ name: 'question_type', type: 'varchar', length: 10 })
  questionType!: VacancyQuestionType;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;
}
