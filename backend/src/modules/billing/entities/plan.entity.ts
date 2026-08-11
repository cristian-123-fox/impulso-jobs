import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  BILLING_CURRENCY,
  BillingPeriod,
  MX_TAX_RATE,
  PlanType,
} from '@/modules/billing/enums/billing.enums';

/**
 * Plan comercial (Media / Alta / Anual).
 *
 * **Los planes son datos, no código**: los da de alta un administrador desde
 * `/admin/plans`. La semilla sólo crea el catálogo de beneficios, porque los
 * precios en MXN y el alcance de la Anual son decisiones de negocio abiertas
 * (ver `Impulso_Jobs_Planes_Suscripciones.md` §7).
 */
@Entity('plans')
export class Plan extends BaseEntity {
  @Index('uq_plans_code', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ name: 'plan_type', type: 'varchar', length: 30 })
  planType!: PlanType;

  /** Precio **sin IVA**, en pesos. El IVA se calcula al cobrar. */
  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  basePrice!: string;

  @Column({ type: 'varchar', length: 3, default: BILLING_CURRENCY })
  currency!: string;

  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: MX_TAX_RATE,
  })
  taxRate!: string;

  /** Días que dura la publicación promocionada. Nulo en la suscripción. */
  @Column({ name: 'validity_days', type: 'int', nullable: true })
  validityDays?: number | null;

  @Column({ name: 'billing_period', type: 'varchar', length: 20 })
  billingPeriod!: BillingPeriod;

  /** Publicaciones incluidas en la suscripción. Nulo = sin cupo definido. */
  @Column({ name: 'posting_quota', type: 'int', nullable: true })
  postingQuota?: number | null;

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  /** Un plan inactivo no aparece en `/plans` ni se puede comprar. */
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  /**
   * Identificadores en la pasarela. Nulos mientras no exista la cuenta: el
   * adaptador manual no los necesita.
   */
  @Column({
    name: 'provider_product_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  providerProductId?: string | null;

  @Column({
    name: 'provider_price_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  providerPriceId?: string | null;
}
