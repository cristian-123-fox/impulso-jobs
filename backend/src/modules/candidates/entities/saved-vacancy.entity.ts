import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Vacante guardada por el aspirante (T17, fase 1 de acciones del candidato).
 * El borrado es FÍSICO (no soft delete): el índice único impediría volver a
 * guardar la misma vacante si la fila quedara marcada como borrada.
 */
@Entity('saved_vacancies')
@Index(
  'uq_saved_vacancies_profile_vacancy',
  ['candidateProfileId', 'vacancyId'],
  {
    unique: true,
  },
)
export class SavedVacancy extends BaseEntity {
  @Index('idx_saved_vacancies_profile_id')
  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;
}
