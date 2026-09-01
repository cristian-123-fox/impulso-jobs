import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Postulación de un candidato a una vacante (HU-012/015).
 *
 * Nunca se elimina: si la vacante se cierra o se pausa, la postulación se
 * conserva como registro histórico y sólo cambia su estado.
 */
@Entity('candidate_applications')
@Index(
  'uq_candidate_applications_profile_vacancy',
  ['candidateProfileId', 'vacancyId'],
  { unique: true },
)
export class CandidateApplication extends BaseEntity {
  @Index('idx_candidate_applications_profile_id')
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Index('idx_candidate_applications_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;

  /**
   * Empresa dueña de la vacante, copiada al postular. Permite listar y contar
   * las postulaciones de una empresa sin join, y mantiene el vínculo aunque la
   * vacante se cierre. Una vacante no cambia de empresa, así que no se
   * desincroniza.
   */
  @Index('idx_candidate_applications_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  /**
   * Hoja de vida adjunta. Nullable: el candidato puede postular sin CV
   * cargada. Si no la indica, se resuelve la marcada por defecto.
   */
  @Column({ name: 'resume_id', type: 'varchar', length: 36, nullable: true })
  resumeId?: string | null;

  @Index('idx_candidate_applications_status_code')
  @Column({ name: 'status_code', type: 'varchar', length: 30 })
  statusCode!: string;

  @Column({ name: 'applied_at', type: 'timestamp' })
  appliedAt!: Date;

  /**
   * Primera vez que la empresa interactuó con la postulación (detalle,
   * historial, cambio de estado o descarga del CV). Null = "no leída".
   * Es a nivel empresa, no por reclutador.
   */
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;

  /** Suma de pesos de las respuestas de filtrado (M15). Null = sin preguntas. */
  @Column({ name: 'score', type: 'int', nullable: true })
  score?: number | null;

  /** Alguna respuesta fue excluyente: el aspirante queda descartado del filtro. */
  @Column({ name: 'is_excluded', type: 'boolean', default: false })
  isExcluded!: boolean;
}
