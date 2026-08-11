import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { SAT_TAX_REGIME_CODES } from '@/common/catalogs/sat-tax-regimes';
import { RFC_REGEX } from '@/common/utils/mx-identifiers';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  COMPANY_TYPES,
  CompanyType,
} from '@/modules/companies/enums/company-type.enum';

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Filtros del listado administrativo de empresas. */
export class ListCompaniesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state?: string;
}

/** Cuenta de acceso creada junto con la empresa (dueño / OWNER). */
export class CreateCompanyOwnerDto {
  @ApiProperty({ example: 'contacto@empresa.com' })
  @Transform(toLower)
  @IsEmail({}, { message: 'El correo del usuario no es válido.' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Secreta#123' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;
}

/**
 * Alta de empresa desde el back-office. Los campos son los mínimos fiscales
 * (RFC/régimen/C.P./estado/municipio); opcionalmente crea el usuario dueño,
 * que es lo que hace la empresa utilizable de inmediato para pruebas.
 */
export class CreateCompanyDto {
  @ApiProperty({ example: 'Northwind' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio.' })
  @MaxLength(160)
  businessName!: string;

  @ApiProperty({ example: 'Northwind S.A. de C.V.' })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria.' })
  @MaxLength(160)
  legalName!: string;

  @ApiProperty({ example: 'NOR900520AB1' })
  @Transform(toUpper)
  @Matches(RFC_REGEX, { message: 'El RFC no tiene un formato válido.' })
  @MaxLength(13)
  rfc!: string;

  @ApiProperty({ example: '601' })
  @IsIn([...SAT_TAX_REGIME_CODES], {
    message: 'El régimen fiscal no es válido.',
  })
  taxRegime!: string;

  @ApiProperty({ example: '45010' })
  @IsString()
  @IsNotEmpty({ message: 'El código postal es obligatorio.' })
  @MaxLength(5)
  postalCode!: string;

  @ApiProperty({ example: 'JAL' })
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state!: string;

  @ApiProperty({ example: 'Zapopan' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  economicSector?: string;

  @ApiPropertyOptional({ enum: [...COMPANY_TYPES] })
  @IsOptional()
  @IsIn([...COMPANY_TYPES], { message: 'El tipo de empresa no es válido.' })
  companyType?: CompanyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'El correo corporativo no es válido.' })
  @MaxLength(255)
  corporateEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'El sitio web no es válido.' })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ type: CreateCompanyOwnerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCompanyOwnerDto)
  owner?: CreateCompanyOwnerDto;
}

/**
 * Edición de empresa desde el back-office. Mismos campos que el alta salvo el
 * **RFC** —inmutable, igual que en el autoservicio de la empresa— y la cuenta
 * dueña, que se gestiona desde el equipo.
 */
export class UpdateCompanyDto {
  @ApiProperty({ example: 'Northwind' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio.' })
  @MaxLength(160)
  businessName!: string;

  @ApiProperty({ example: 'Northwind S.A. de C.V.' })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria.' })
  @MaxLength(160)
  legalName!: string;

  @ApiProperty({ example: '601' })
  @IsIn([...SAT_TAX_REGIME_CODES], {
    message: 'El régimen fiscal no es válido.',
  })
  taxRegime!: string;

  @ApiProperty({ example: '45010' })
  @IsString()
  @IsNotEmpty({ message: 'El código postal es obligatorio.' })
  @MaxLength(5)
  postalCode!: string;

  @ApiProperty({ example: 'JAL' })
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state!: string;

  @ApiProperty({ example: 'Zapopan' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  economicSector?: string;

  @ApiPropertyOptional({ enum: [...COMPANY_TYPES] })
  @IsOptional()
  @IsIn([...COMPANY_TYPES], { message: 'El tipo de empresa no es válido.' })
  companyType?: CompanyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'El correo corporativo no es válido.' })
  @MaxLength(255)
  corporateEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'El sitio web no es válido.' })
  @MaxLength(255)
  website?: string;
}

/** Empresa en el listado admin, con su dueño y número de miembros. */
export interface AdminCompanyResponseDto {
  id: string;
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  economicSector: string | null;
  companyType: string | null;
  corporateEmail: string | null;
  phoneNumber: string | null;
  website: string | null;
  country: string;
  state: string;
  municipality: string;
  logoUrl: string | null;
  createdAt: string;
  ownerEmail: string | null;
  memberCount: number;
}

export interface AdminCompanyExtras {
  ownerEmail?: string | null;
  memberCount?: number;
}

export function toAdminCompanyResponse(
  company: Company,
  extras: AdminCompanyExtras = {},
): AdminCompanyResponseDto {
  return {
    id: company.id,
    businessName: company.businessName,
    legalName: company.legalName,
    rfc: company.rfc,
    taxRegime: company.taxRegime,
    postalCode: company.postalCode,
    economicSector: company.economicSector ?? null,
    companyType: company.companyType ?? null,
    corporateEmail: company.corporateEmail ?? null,
    phoneNumber: company.phoneNumber ?? null,
    website: company.website ?? null,
    country: company.country,
    state: company.state,
    municipality: company.municipality,
    logoUrl: company.logoUrl ?? null,
    createdAt: company.createdAt.toISOString(),
    ownerEmail: extras.ownerEmail ?? null,
    memberCount: extras.memberCount ?? 0,
  };
}
