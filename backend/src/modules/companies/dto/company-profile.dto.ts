import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SAT_CFDI_USE_CODES } from '@/common/catalogs/sat-cfdi-uses';
import { SAT_TAX_REGIME_CODES } from '@/common/catalogs/sat-tax-regimes';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  COMPANY_TYPES,
  CompanyType,
} from '@/modules/companies/enums/company-type.enum';

export class UpdateCompanyProfileDto {
  /**
   * RFC — inmutable tras el registro. Se acepta opcionalmente solo para
   * detectar y rechazar intentos de modificación; no se persiste.
   */
  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio.' })
  @MaxLength(160)
  businessName!: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria.' })
  @MaxLength(160)
  legalName!: string;

  @IsIn([...SAT_TAX_REGIME_CODES], {
    message: 'El régimen fiscal no es válido.',
  })
  taxRegime!: string;

  @IsOptional()
  @IsIn([...SAT_CFDI_USE_CODES], { message: 'El uso de CFDI no es válido.' })
  cfdiUse?: string;

  @IsString()
  @IsNotEmpty({ message: 'El código postal es obligatorio.' })
  @MaxLength(5)
  postalCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  economicSector?: string;

  @IsOptional()
  @IsIn([...COMPANY_TYPES], { message: 'El tipo de empresa no es válido.' })
  companyType?: CompanyType;

  @IsOptional()
  @IsEmail({}, { message: 'El correo corporativo no es válido.' })
  @MaxLength(255)
  corporateEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'El sitio web no es válido.' })
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state!: string;

  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  companyDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  employeeCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1800)
  foundationYear?: number;
}

export class UpdateCompanyLogoDto {
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'La URL del logo no es válida.' })
  @MaxLength(500)
  logoUrl?: string | null;
}

export interface CompanyProfileResponseDto {
  id: string;
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  cfdiUse: string | null;
  postalCode: string;
  economicSector: string | null;
  companyType: string | null;
  corporateEmail: string | null;
  phoneNumber: string | null;
  website: string | null;
  country: string;
  state: string;
  municipality: string;
  address: string | null;
  companyDescription: string | null;
  employeeCount: number | null;
  foundationYear: number | null;
  logoUrl: string | null;
  companyRole: string | null;
}

export function toCompanyProfileResponse(
  company: Company,
  companyRole: string | null = null,
): CompanyProfileResponseDto {
  return {
    id: company.id,
    businessName: company.businessName,
    legalName: company.legalName,
    rfc: company.rfc,
    taxRegime: company.taxRegime,
    cfdiUse: company.cfdiUse ?? null,
    postalCode: company.postalCode,
    economicSector: company.economicSector ?? null,
    companyType: company.companyType ?? null,
    corporateEmail: company.corporateEmail ?? null,
    phoneNumber: company.phoneNumber ?? null,
    website: company.website ?? null,
    country: company.country,
    state: company.state,
    municipality: company.municipality,
    address: company.address ?? null,
    companyDescription: company.companyDescription ?? null,
    employeeCount: company.employeeCount ?? null,
    foundationYear: company.foundationYear ?? null,
    logoUrl: company.logoUrl ?? null,
    companyRole,
  };
}
