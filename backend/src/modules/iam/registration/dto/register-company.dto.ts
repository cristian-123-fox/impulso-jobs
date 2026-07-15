import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { SAT_TAX_REGIME_CODES } from '@/common/catalogs/sat-tax-regimes';
import { MX_POSTAL_CODE_REGEX, RFC_REGEX } from '@/common/utils/mx-identifiers';

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class RegisterCompanyDto {
  @ApiProperty({ example: 'Impulso Talent' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio.' })
  @MaxLength(160)
  businessName!: string;

  @ApiProperty({ example: 'Impulso Talent S.A. de C.V.' })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria.' })
  @MaxLength(160)
  legalName!: string;

  @ApiProperty({ example: 'ITA160101AB2' })
  @Transform(toUpper)
  @Matches(RFC_REGEX, { message: 'El RFC no tiene un formato válido.' })
  rfc!: string;

  @ApiProperty({ example: '601', description: 'Código de régimen fiscal SAT.' })
  @IsIn([...SAT_TAX_REGIME_CODES], {
    message: 'El régimen fiscal no es válido.',
  })
  taxRegime!: string;

  @ApiProperty({ example: '44100' })
  @Matches(MX_POSTAL_CODE_REGEX, {
    message: 'El código postal debe tener 5 dígitos.',
  })
  postalCode!: string;

  @ApiPropertyOptional({ example: 'Tecnología' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  economicSector?: string;

  @ApiPropertyOptional({ example: 'https://impulso.jobs' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: 'MX' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @ApiProperty({
    example: 'JAL',
    description: 'Código de estado (ISO 3166-2:MX).',
  })
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state!: string;

  @ApiProperty({ example: 'Guadalajara' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;
}
