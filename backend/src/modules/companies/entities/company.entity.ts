import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/** Empresa empleadora (localizada a México: RFC, régimen fiscal SAT, C.P.). */
@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'business_name', type: 'varchar', length: 160 })
  businessName!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 160 })
  legalName!: string;

  @Index('uq_companies_rfc', { unique: true })
  @Column({ type: 'varchar', length: 13 })
  rfc!: string;

  /** Código de régimen fiscal SAT (c_RegimenFiscal), p. ej. "601". */
  @Column({ name: 'tax_regime', type: 'varchar', length: 4 })
  taxRegime!: string;

  /** C.P. — requerido para CFDI. */
  @Column({ name: 'postal_code', type: 'varchar', length: 5 })
  postalCode!: string;

  @Column({
    name: 'economic_sector',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  economicSector?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', length: 60, default: 'MX' })
  country!: string;

  /** Código de estado (ISO 3166-2:MX), p. ej. "JAL". */
  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  municipality!: string;
}
