import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Recurso lógico (primer segmento del `code` de permiso), p. ej. `vacancies`. */
@Entity('components')
export class Component extends BaseEntity {
  @Index('uq_components_code', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;
}
