import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Acuse de un aviso de vencimiento ya enviado (T22).
 *
 * Existe sólo por idempotencia: el job corre a diario y, sin este registro,
 * reenviaría el mismo correo cada día mientras la suscripción siguiera dentro
 * del umbral. El único índice `(subscription_id, period_end, threshold_days)`
 * es el que hace de candado.
 *
 * `period_end` forma parte de la clave a propósito: al renovar, la suscripción
 * estrena fecha de fin y sus avisos deben poder volver a enviarse.
 */
@Entity('subscription_notices')
@Index(
  'uq_subscription_notices_sub_period_threshold',
  ['subscriptionId', 'periodEnd', 'thresholdDays'],
  { unique: true },
)
export class SubscriptionNotice extends BaseEntity {
  @Column({ name: 'subscription_id', type: 'varchar', length: 36 })
  subscriptionId!: string;

  /** Denormalizado para poder auditar por empresa sin un join. */
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  /** Umbral que disparó el aviso, en días (30, 7, 1…). */
  @Column({ name: 'threshold_days', type: 'int' })
  thresholdDays!: number;

  /** Fin de periodo vigente cuando se envió. Parte de la clave única. */
  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd!: Date;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt!: Date;
}
