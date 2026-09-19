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
import { COUNTRY_CODES } from '@/common/catalogs/countries';
import { CURP_REGEX } from '@/common/utils/mx-identifiers';
import {
  DOCUMENT_TYPES,
  DocumentType,
} from '@/modules/candidates/enums/document-type.enum';

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/**
 * Datos del aspirante en el registro. Desde T36 admite **MX, CO, US y CA**.
 *
 * Aquí se valida la **forma** de cada campo por separado. Las reglas cruzadas
 * —que la subdivisión sea de ese país y que el tipo de documento lo emita ese
 * país— viven en `common/validators/candidate-identity.validator.ts` y las
 * aplica el caso de uso, porque cada una tiene que llegar al frontend con su
 * propio `errorCode` (`INVALID_SUBDIVISION`, `INVALID_DOCUMENT_NUMBER`).
 */
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

  /**
   * País de residencia. Obligatorio: es lo que condiciona la subdivisión y la
   * lista de documentos, así que ya no puede venir quemado como `'MX'`.
   */
  @ApiProperty({ enum: [...COUNTRY_CODES], example: 'MX' })
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], { message: 'El país no está disponible.' })
  country!: string;

  /**
   * País emisor del documento. Si no viene, se toma el de residencia — que es
   * el caso normal; se separa porque un residente en Estados Unidos puede
   * identificarse con su pasaporte mexicano.
   */
  @ApiPropertyOptional({ enum: [...COUNTRY_CODES], example: 'MX' })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], {
    message: 'El país del documento no está disponible.',
  })
  documentCountry?: string;

  @ApiProperty({ enum: [...DOCUMENT_TYPES] })
  @Transform(toUpper)
  @IsIn([...DOCUMENT_TYPES], { message: 'El tipo de documento no es válido.' })
  documentType!: DocumentType;

  @ApiProperty({ example: 'GARA900520HDFXXX01' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @MaxLength(40)
  documentNumber!: string;

  /** Sólo tiene sentido para México; el resto de países la ignoran. */
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

  /**
   * Código de la subdivisión de primer nivel: estado (MX/US), departamento (CO)
   * o provincia/territorio (CA). **No se valida contra una lista fija aquí**:
   * la lista depende del país (`isValidSubdivision`), y los códigos colisionan
   * entre países (`GUA`, `DC`).
   */
  @ApiProperty({
    example: 'JAL',
    description: 'Código de la subdivisión, dentro del país indicado.',
  })
  @Transform(toUpper)
  @IsString()
  @IsNotEmpty({ message: 'La subdivisión es obligatoria.' })
  @MaxLength(10)
  state!: string;

  @ApiProperty({ example: 'Zapopan' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio o la ciudad es obligatorio.' })
  @MaxLength(120)
  municipality!: string;

  /** Se normaliza a E.164 con `phoneCountry` antes de guardar. */
  @ApiPropertyOptional({ example: '3312345678' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;

  /**
   * País del teléfono. Si no viene, se toma el de residencia. Es columna aparte
   * porque `+1` es Estados Unidos **y** Canadá (D-1).
   */
  @ApiPropertyOptional({ enum: [...COUNTRY_CODES], example: 'MX' })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], {
    message: 'El país del teléfono no está disponible.',
  })
  phoneCountry?: string;
}
