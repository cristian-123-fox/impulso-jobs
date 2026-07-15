import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Bitácora de acciones (actor, acción, entidad, ip, user-agent, metadata). */
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({
    name: 'actor_user_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  actorUserId?: string | null;

  @Index('idx_audit_logs_action')
  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  entity?: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 36, nullable: true })
  entityId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;
}
