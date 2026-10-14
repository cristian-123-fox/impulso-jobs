import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { LegalDocumentResponseDto } from '@/modules/legal/dto/legal.response.dto';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import {
  LEGAL_DOCUMENT_REPOSITORY,
  type ILegalDocumentRepository,
} from '@/modules/legal/repositories/legal-document.repository.interface';

/**
 * Versiones vigentes y, por código, el historial completo.
 *
 * Es público a propósito. La web necesita conocer la versión vigente antes de
 * mandar un consentimiento, y el artículo 16 de la LFPDPPP obliga a que el
 * titular pueda saber qué documentos existen y desde cuándo rigen.
 */
@Injectable()
export class GetLegalDocumentsUseCase {
  constructor(
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly documents: ILegalDocumentRepository,
  ) {}

  async current(): Promise<LegalDocumentResponseDto[]> {
    const rows = await this.documents.listCurrent();
    return rows.map((row) => LegalDocumentMapper.toResponse(row));
  }

  async history(code: LegalDocumentCode): Promise<LegalDocumentResponseDto[]> {
    const rows = await this.documents.listHistory(code);
    if (rows.length === 0) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.LEGAL_DOCUMENT_NOT_FOUND,
        'No hay ningún documento con ese código.',
      );
    }
    return rows.map((row) => LegalDocumentMapper.toResponse(row));
  }
}

/**
 * Entidad → DTO. Vive aquí y no en el controller porque lo comparten los dos
 * endpoints y porque la regla del repo es que las entidades TypeORM no salen
 * nunca por HTTP.
 */
export const LegalDocumentMapper = {
  toResponse(row: LegalDocument): LegalDocumentResponseDto {
    return {
      code: row.code,
      version: row.version,
      locale: row.locale,
      title: row.title,
      effectiveDate: row.effectiveDate,
      isCurrent: row.isCurrent,
      blocksRegistration: row.blocksRegistration,
    };
  },
};
