import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Asignación rol↔usuario (fuente de verdad del RBAC para el guard). */
@Entity('user_roles')
@Index('uq_user_roles_user_role', ['userId', 'roleId'], { unique: true })
export class UserRole extends BaseEntity {
  @Index('idx_user_roles_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'role_id', type: 'varchar', length: 36 })
  roleId!: string;
}
