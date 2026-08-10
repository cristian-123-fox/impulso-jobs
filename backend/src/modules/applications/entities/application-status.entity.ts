import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Catálogo de estados del proceso de selección. Sigue el patrón de
 * `languages`: la clave primaria es el código legible, no un autoincremental,
 * para que el historial y las postulaciones se lean sin resolver ids.
 */
@Entity('application_status')
export class ApplicationStatus {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  /** Orden de presentación en la UI del reclutador. */
  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  /** Estado terminal: el proceso del candidato ya no avanza desde aquí. */
  @Column({ name: 'is_final', type: 'boolean', default: false })
  isFinal!: boolean;
}
