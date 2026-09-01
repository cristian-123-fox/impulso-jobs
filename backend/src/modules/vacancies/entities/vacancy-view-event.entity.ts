import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Evento crudo de vista del detalle público (T18). No se consulta en caliente:
 * el job `views:consolidate` los suma a `vacancies.views_count` una vez al día
 * y los borra (patrón Computrabajo §4 — "se actualizan una vez al día").
 */
@Entity('vacancy_view_events')
export class VacancyViewEvent extends BaseEntity {
  @Index('idx_vacancy_view_events_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;
}
