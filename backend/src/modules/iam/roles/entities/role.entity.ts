import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { RoleScope } from '@/common/types/role-scope.enum';

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

  /**
   * A quién sirve el rol. Separa las pestañas de `/admin/roles` y decide qué
   * permisos se le ofrecen. `varchar` y no `enum`: el esquema tiene que valer
   * igual en MySQL y en PostgreSQL.
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: RoleScope.PLATFORM,
  })
  scope!: RoleScope;
}
