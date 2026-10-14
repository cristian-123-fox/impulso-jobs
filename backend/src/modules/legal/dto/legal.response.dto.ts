import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';

/** Versión vigente de un documento. Es lo que el front compara con lo suyo. */
export class LegalDocumentResponseDto {
  @ApiProperty({ enum: LegalDocumentCode })
  code!: LegalDocumentCode;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: 'es' })
  locale!: string;

  @ApiProperty({ example: 'Términos y condiciones' })
  title!: string;

  @ApiProperty({ example: '2026-10-01' })
  effectiveDate!: string;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty({
    description: 'true si sin este documento no se puede usar el servicio.',
  })
  blocksRegistration!: boolean;
}

export class LegalConsentResponseDto {
  @ApiProperty()
  id!: string;

  /**
   * Correo del titular. Es su propio dato y se lo devuelve a él, así que no
   * hay razón para ocultárselo; y sin él el registro no prueba nada, porque una
   * fila sin titular no se puede atribuir a nadie.
   */
  @ApiProperty({ nullable: true, type: String })
  subjectEmail!: string | null;

  @ApiProperty({ enum: LegalDocumentCode })
  documentCode!: LegalDocumentCode;

  @ApiProperty({ example: '1.0.0' })
  documentVersion!: string;

  @ApiProperty()
  granted!: boolean;

  @ApiProperty({ enum: ConsentMethod })
  consentMethod!: ConsentMethod;

  @ApiProperty({ enum: ConsentSource })
  source!: ConsentSource;

  @ApiPropertyOptional()
  ip?: string | null;

  @ApiPropertyOptional()
  userAgent?: string | null;

  @ApiProperty({ description: 'ISO-8601 UTC. Es `created_at` de la fila.' })
  consentedAt!: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;
}

export class RecordConsentResultDto {
  @ApiProperty({ type: [LegalConsentResponseDto] })
  recorded!: LegalConsentResponseDto[];
}

/**
 * Fila del listado del back-office.
 *
 * Extiende la del titular con `hasSession` y **no** con el `userId`: el id
 * interno no hace falta para comprobar una aceptación y no hay motivo para
 * exponerlo a quien consulta. Lo que sí es relevante es si hubo sesión detrás,
 * porque una decisión de un visitante anónimo sólo se puede imputar por el
 * correo, y eso cambia cómo se lee la fila.
 */
export class AdminLegalConsentResponseDto extends LegalConsentResponseDto {
  @ApiProperty({
    description:
      'true si la decisión se tomó con una sesión iniciada; false si viene de ' +
      'un flujo sin cuenta (contacto, newsletter, banner de cookies).',
  })
  hasSession!: boolean;
}
