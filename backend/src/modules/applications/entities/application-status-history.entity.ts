import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Rastro inmutable de cada transición de estado de una postulación. Se escribe
 * en la misma transacción que el cambio, de modo que no puede existir un
 * estado nuevo sin su línea de historial.
 */
@Entity('application_status_history')
export class ApplicationStatusHistory extends BaseEntity {
  @Index('idx_application_status_history_application_id')
  @Column({ name: 'application_id', type: 'varchar', length: 36 })
  applicationId!: string;

  /** Nulo sólo en la línea inicial, la que crea la postulación. */
  @Column({
    name: 'previous_status_code',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  previousStatusCode?: string | null;

  @Column({ name: 'current_status_code', type: 'varchar', length: 30 })
  currentStatusCode!: string;

  /**
   * Usuario que provocó el cambio. Nulo si lo origina el sistema (p. ej. el
   * cierre masivo de una vacante en M16).
   */
  @Column({ name: 'changed_by', type: 'varchar', length: 36, nullable: true })
  changedBy?: string | null;

  @Column({ name: 'changed_at', type: 'timestamp' })
  changedAt!: Date;
}
