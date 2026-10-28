import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';

/**
 * Suscripción anual de una empresa (plan Anual). Es el equivalente de
 * `vacancy_promotions` pero a nivel empresa: no promociona una vacante
 * concreta, habilita beneficios mientras esté vigente.
 */
@Entity('company_subscriptions')
export class CompanySubscription extends BaseEntity {
  @Index('idx_company_subscriptions_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 36 })
  planId!: string;

  @Index('idx_company_subscriptions_status')
  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionStatus.PENDING_PAYMENT,
  })
  status!: SubscriptionStatus;

  /** Identificador en la pasarela. Nulo con el adaptador manual. */
  @Column({
    name: 'provider_subscription_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  providerSubscriptionId?: string | null;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt?: Date | null;

  /**
   * Fin del periodo pagado. Se resincroniza en cada renovación; al renovar se
   * recargan los cupos de la base de talento.
   */
  @Index('idx_company_subscriptions_period_end')
  @Column({ name: 'current_period_end', type: 'timestamp', nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ name: 'auto_renew', type: 'boolean', default: true })
  autoRenew!: boolean;

  /** Créditos de publicación incluidos en el periodo. */
  @Column({ name: 'posting_credits', type: 'int', default: 0 })
  postingCredits!: number;

  /** Créditos de publicación ya consumidos en el periodo. */
  @Column({ name: 'used_posting_credits', type: 'int', default: 0 })
  usedPostingCredits!: number;

  /** Cupos de promoción incluidos en el periodo. */
  @Column({ name: 'promotion_credits', type: 'int', default: 0 })
  promotionCredits!: number;

  /** Cupos de promoción ya consumidos en el periodo. */
  @Column({ name: 'used_promotion_credits', type: 'int', default: 0 })
  usedPromotionCredits!: number;
}

