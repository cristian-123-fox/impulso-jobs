import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { CURP_REGEX } from '@/common/utils/mx-identifiers';
import {
  DOCUMENT_TYPES,
  DocumentType,
} from '@/modules/candidates/enums/document-type.enum';

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class RegisterCandidateDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ enum: [...DOCUMENT_TYPES] })
  @IsIn([...DOCUMENT_TYPES], { message: 'El tipo de documento no es válido.' })
  documentType!: DocumentType;

  @ApiProperty({ example: 'GARA900520HDFXXX01' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @MaxLength(40)
  documentNumber!: string;

  @ApiPropertyOptional({ example: 'GARA900520HDFXXX01' })
  @IsOptional()
  @Transform(toUpper)
  @Matches(CURP_REGEX, { message: 'La CURP no tiene un formato válido.' })
  curp?: string;

  @ApiProperty({
    example: '1990-05-20',
    description: 'Fecha de nacimiento (no futura).',
  })
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida.' })
  birthDate!: string;

  @ApiPropertyOptional({ example: 'Desarrolladora Full-Stack' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  professionalTitle?: string;

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

  @ApiProperty({ example: 'Zapopan' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;
}
