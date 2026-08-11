import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { FeatureValueType } from '@/modules/billing/enums/billing.enums';

/**
 * Catálogo de beneficios. Clave primaria = código legible, igual que
 * `application_status` y `languages`: el valor por plan se lee sin resolver ids.
 */
@Entity('plan_features')
export class PlanFeature {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ name: 'value_type', type: 'varchar', length: 20 })
  valueType!: FeatureValueType;

  @Index('idx_plan_features_sort_order')
  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;
}
