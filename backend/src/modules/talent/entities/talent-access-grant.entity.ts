import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Cupo de visitas a la base de talento otorgado a una empresa (HU-016).
 *
 * **Quién lo crea:** M14 (billing), al activar una promoción o una suscripción.
 * Este módulo sólo lo **lee y lo consume**. Mientras M14 no exista no hay
 * grants, así que toda empresa tiene 0 visitas y la base de talento queda
 * bloqueada con mensaje de upsell — que es justo el comportamiento correcto
 * para una cuenta sin plan contratado.
 */
@Entity('talent_access_grants')
export class TalentAccessGrant extends BaseEntity {
  @Index('idx_talent_access_grants_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType!: string;

  /** Promoción o suscripción que lo originó. Nulo si es manual. */
  @Column({ name: 'source_id', type: 'varchar', length: 36, nullable: true })
  sourceId?: string | null;

  /** `-1` = ilimitado (`UNLIMITED_VISITS`). */
  @Column({ name: 'total_visits', type: 'int' })
  totalVisits!: number;

  @Column({ name: 'used_visits', type: 'int', default: 0 })
  usedVisits!: number;

  /** Nulo = sin vencimiento. */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;
}
