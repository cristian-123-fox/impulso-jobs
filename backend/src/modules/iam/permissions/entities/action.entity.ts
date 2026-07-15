import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Acción sobre un recurso (resto del `code`), p. ej. `read`, `status.update`. */
@Entity('actions')
export class Action extends BaseEntity {
  @Index('uq_actions_code', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;
}
