import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Valor de un beneficio en un plan concreto. `is_included` cubre los booleanos
 * y `value` los numéricos/texto (p. ej. `talent_db_access = "20"`, o `"-1"`
 * para ilimitado).
 */
@Entity('plan_feature_values')
@Index('uq_plan_feature_values_plan_feature', ['planId', 'featureCode'], {
  unique: true,
})
export class PlanFeatureValue extends BaseEntity {
  @Index('idx_plan_feature_values_plan_id')
  @Column({ name: 'plan_id', type: 'varchar', length: 36 })
  planId!: string;

  @Column({ name: 'feature_code', type: 'varchar', length: 60 })
  featureCode!: string;

  @Column({ name: 'is_included', type: 'boolean', default: false })
  isIncluded!: boolean;

  /** Nulo en los beneficios puramente booleanos. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  value?: string | null;
}
