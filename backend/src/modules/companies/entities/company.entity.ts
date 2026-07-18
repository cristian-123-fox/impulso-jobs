import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { CompanyType } from '@/modules/companies/enums/company-type.enum';

/** Empresa empleadora (localizada a México: RFC, régimen fiscal SAT, C.P.). */
@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'business_name', type: 'varchar', length: 160 })
  businessName!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 160 })
  legalName!: string;

  /** RFC — inmutable tras el registro. */
  @Index('uq_companies_rfc', { unique: true })
  @Column({ type: 'varchar', length: 13 })
  rfc!: string;

  /** Código de régimen fiscal SAT (c_RegimenFiscal), p. ej. "601". */
  @Column({ name: 'tax_regime', type: 'varchar', length: 4 })
  taxRegime!: string;

  /** Código de uso de CFDI SAT (c_UsoCFDI), p. ej. "G03". Para facturación (M18). */
  @Column({ name: 'cfdi_use', type: 'varchar', length: 4, nullable: true })
  cfdiUse?: string | null;

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

  @Column({ name: 'company_type', type: 'varchar', length: 30, nullable: true })
  companyType?: CompanyType | null;

  @Column({
    name: 'corporate_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  corporateEmail?: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', length: 60, default: 'MX' })
  country!: string;

  /** Código de estado (ISO 3166-2:MX), p. ej. "JAL". */
  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  municipality!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({
    name: 'company_description',
    type: 'text',
    nullable: true,
  })
  companyDescription?: string | null;

  @Column({ name: 'employee_count', type: 'int', nullable: true })
  employeeCount?: number | null;

  @Column({ name: 'foundation_year', type: 'int', nullable: true })
  foundationYear?: number | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;
}
