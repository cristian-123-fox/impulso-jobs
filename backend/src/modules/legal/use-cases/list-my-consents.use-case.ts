import { Inject, Injectable } from '@nestjs/common';
import { LegalConsentResponseDto } from '@/modules/legal/dto/legal.response.dto';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import {
  LEGAL_CONSENT_REPOSITORY,
  type ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';

/** Tope duro: el historial completo de un usuario no crece sin control. */
const MAX_HISTORY = 200;

/**
 * Historial de consentimientos del titular (art. 22 LFPDPPP: derecho de acceso).
 *
 * Devuelve **todas** las filas, incluidas las revocaciones, en orden
 * inverso. El front calcula de ahí qué documentos están vigentes (la última fila
 * de cada código con `granted: true`).
 */
@Injectable()
export class ListMyConsentsUseCase {
  constructor(
    @Inject(LEGAL_CONSENT_REPOSITORY)
    private readonly consents: ILegalConsentRepository,
  ) {}

  async execute(
    userId: string | null,
    email: string | null,
  ): Promise<LegalConsentResponseDto[]> {
    const rows = await this.consents.listBySubject(userId, email, MAX_HISTORY);
    return rows.map((row) => LegalConsentMapper.toResponse(row));
  }
}

export const LegalConsentMapper = {
  toResponse(row: LegalConsent): LegalConsentResponseDto {
    return {
      id: row.id,
      subjectEmail: row.subjectEmail ?? null,
      documentCode: row.documentCode,
      documentVersion: row.documentVersion,
      granted: row.granted,
      consentMethod: row.consentMethod,
      source: row.source,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      consentedAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
      metadata: row.metadata ?? null,
    };
  },
};
