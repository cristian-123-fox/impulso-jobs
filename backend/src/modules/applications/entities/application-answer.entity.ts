import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Respuesta del aspirante a una pregunta de filtrado (M15). Congela el peso
 * aplicado al momento de postular: si la empresa cambiara las preguntas
 * después, el puntaje histórico no se recalcula.
 */
@Entity('application_answers')
export class ApplicationAnswer extends BaseEntity {
  @Index('idx_application_answers_application_id')
  @Column({ name: 'application_id', type: 'varchar', length: 36 })
  applicationId!: string;

  @Column({ name: 'question_id', type: 'varchar', length: 36 })
  questionId!: string;

  /** Texto de la pregunta al momento de responder (snapshot). */
  @Column({ name: 'question_text', type: 'varchar', length: 200 })
  questionText!: string;

  @Column({ name: 'option_id', type: 'varchar', length: 36, nullable: true })
  optionId?: string | null;

  /** Texto elegido (cerrada) o escrito (abierta). */
  @Column({ name: 'answer_text', type: 'varchar', length: 1000 })
  answerText!: string;

  /** Peso aplicado: -1 excluyente, 0..10 puntaje; null en preguntas abiertas. */
  @Column({ name: 'weight', type: 'smallint', nullable: true })
  weight?: number | null;
}
