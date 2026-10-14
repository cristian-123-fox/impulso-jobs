import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHash,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';

/**
 * Un documento aceptado, tal y como lo mostró la web.
 *
 * El `version` lo declara el cliente y la API lo contrasta contra
 * `legal_documents`. Si el front y el back no coinciden en la versión vigente,
 * la petición se rechaza con `LEGAL_DOCUMENT_VERSION_UNKNOWN`: preferimos no
 * tener constancia a tener una constancia que apunta a un texto que ya no
 * existe en ningún lado.
 */
export class AcceptedDocumentDto {
  @ApiProperty({ enum: LegalDocumentCode })
  @IsEnum(LegalDocumentCode)
  code!: LegalDocumentCode;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MaxLength(20)
  version!: string;

  @ApiPropertyOptional({
    description: 'SHA-256 en hexadecimal del texto que se mostró.',
    example: '9f2c…',
  })
  @IsOptional()
  @IsHash('sha256')
  contentHash?: string;

  @ApiProperty({
    description:
      'true aceptó el documento; false lo rechazó. Un documento con ' +
      '`blocksRegistration` en el catálogo no puede llegar aquí con false.',
  })
  @IsBoolean()
  granted!: boolean;
}

/**
 * Registro de consentimiento. Acepta **varios** documentos en una sola llamada:
 * un alta de cuenta vacante manda Términos, Aviso y (si es candidato) Cesión de
 * imagen, y una sola fila por documento es más barato y más fácil de auditar
 * que tres peticiones.
 */
export class RecordConsentDto {
  @ApiProperty({ type: [AcceptedDocumentDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AcceptedDocumentDto)
  documents!: AcceptedDocumentDto[];

  @ApiProperty({ enum: ConsentMethod })
  @IsEnum(ConsentMethod)
  method!: ConsentMethod;

  @ApiProperty({ enum: ConsentSource })
  @IsEnum(ConsentSource)
  source!: ConsentSource;

  @ApiPropertyOptional({
    description:
      'Correo del titular. Obligatorio sólo cuando no hay sesión (formulario de ' +
      'contacto, newsletter, banner de cookies): sin él, la aceptación no se ' +
      'podría relacionar después con nadie.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectEmail?: string;

  @ApiPropertyOptional({
    description:
      'Contexto de la aceptación: `vacancyId`, `planId`, `formId`… Se guarda ' +
      'tal cual en la fila, para poder demostrar qué pantalla la showed.',
    example: { vacancyId: '9b1…', formId: 'contacto' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WithdrawConsentDto {
  @ApiProperty({ enum: LegalDocumentCode })
  @IsEnum(LegalDocumentCode)
  code!: LegalDocumentCode;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
