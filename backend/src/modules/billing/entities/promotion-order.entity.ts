import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  BILLING_CURRENCY,
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';

/**
 * Orden de cobro. Factura tanto una promoción de vacante como una suscripción
 * — exactamente uno de los dos está informado.
 *
 * Los importes se guardan en **pesos** (decimal). La conversión a centavos es
 * cosa del adaptador de pago, porque es un detalle de la pasarela.
 */
@Entity('promotion_orders')
export class PromotionOrder extends BaseEntity {
  @Index('idx_promotion_orders_promotion_id')
  @Column({ name: 'promotion_id', type: 'varchar', length: 36, nullable: true })
  promotionId?: string | null;

  @Index('idx_promotion_orders_subscription_id')
  @Column({
    name: 'subscription_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  subscriptionId?: string | null;

  @Index('idx_promotion_orders_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  /** Proveedor que procesa el cobro (`manual`, `stripe`, …). */
  @Column({ type: 'varchar', length: 30 })
  provider!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 20 })
  paymentMethod!: PaymentMethod;

  @Index('idx_promotion_orders_payment_status')
  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: string;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2 })
  taxAmount!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: string;

  @Column({ type: 'varchar', length: 3, default: BILLING_CURRENCY })
  currency!: string;

  /** Referencia de la sesión/intento en la pasarela. */
  @Index('idx_promotion_orders_external_reference')
  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  externalReference?: string | null;

  /** Vale de OXXO: URL imprimible, referencia y caducidad. */
  @Column({ name: 'voucher_url', type: 'varchar', length: 500, nullable: true })
  voucherUrl?: string | null;

  @Column({
    name: 'voucher_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  voucherReference?: string | null;

  @Column({ name: 'voucher_expires_at', type: 'timestamp', nullable: true })
  voucherExpiresAt?: Date | null;

  /** Meses sin intereses. 1 = pago en una sola exhibición. */
  @Column({ type: 'int', default: 1 })
  installments!: number;

  /** UUID del CFDI emitido. Lo rellenará M18. */
  @Column({ name: 'cfdi_uuid', type: 'varchar', length: 60, nullable: true })
  cfdiUuid?: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;
}
