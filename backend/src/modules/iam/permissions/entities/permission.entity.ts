import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Permiso `component.action` (código único), enlazado a su component y action. */
@Entity('permissions')
export class Permission extends BaseEntity {
  @Index('uq_permissions_code', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  code!: string;

  @Column({ name: 'component_id', type: 'varchar', length: 36 })
  componentId!: string;

  @Column({ name: 'action_id', type: 'varchar', length: 36 })
  actionId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}
