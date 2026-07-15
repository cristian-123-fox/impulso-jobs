import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Rol de plataforma. `is_system` marca los base (ADMIN/EMPLOYER/CANDIDATE). */
@Entity('roles')
export class Role extends BaseEntity {
  @Index('uq_roles_code', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;
}
