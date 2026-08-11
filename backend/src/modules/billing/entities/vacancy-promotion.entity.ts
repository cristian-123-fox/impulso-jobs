import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  BILLING_CURRENCY,
  PromotionStatus,
} from '@/modules/billing/enums/billing.enums';

/**
 * Compra de un plan por publicación (Media / Alta) aplicada a **una** vacante.
 *
 * Nace en `PENDING_PAYMENT` y sólo aplica beneficios cuando el pago se
 * confirma. `price_paid` se congela al crearla: si mañana sube el precio del
 * plan, esta compra conserva lo que se cobró.
 */
@Entity('vacancy_promotions')
export class VacancyPromotion extends BaseEntity {
  @Index('idx_vacancy_promotions_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 36 })
  planId!: string;

  @Index('idx_vacancy_promotions_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Column({ name: 'purchased_by', type: 'varchar', length: 36 })
  purchasedBy!: string;

  @Index('idx_vacancy_promotions_status')
  @Column({
    type: 'varchar',
    length: 20,
    default: PromotionStatus.PENDING_PAYMENT,
  })
  status!: PromotionStatus;

  /** Precio congelado, **sin IVA**. */
  @Column({
    name: 'price_paid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  pricePaid!: string;

  @Column({ type: 'varchar', length: 3, default: BILLING_CURRENCY })
  currency!: string;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt?: Date | null;

  /** `starts_at + plan.validity_days`, fijado al activar. */
  @Index('idx_vacancy_promotions_ends_at')
  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt?: Date | null;
}
