import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Asignación permiso↔rol. `role_id` se guarda como columna plana (sin relación
 * TypeORM a `Role`) para que el módulo de permisos no dependa del de roles.
 */
@Entity('role_permissions')
@Index('uq_role_permissions', ['roleId', 'permissionId'], { unique: true })
export class RolePermission extends BaseEntity {
  @Index('idx_role_permissions_role_id')
  @Column({ name: 'role_id', type: 'varchar', length: 36 })
  roleId!: string;

  @Column({ name: 'permission_id', type: 'varchar', length: 36 })
  permissionId!: string;
}
