import { EntityManager } from 'typeorm';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';

export const LEGAL_DOCUMENT_REPOSITORY = 'LEGAL_DOCUMENT_REPOSITORY';

export interface ILegalDocumentRepository {
  /** Versiones vigentes, indexadas por código. */
  listCurrent(manager?: EntityManager): Promise<LegalDocument[]>;

  /**
   * Una versión concreta, exista o no como vigente. Se usa para validar lo que
   * el cliente dice estar mostrando: si el código no está en el catálogo, la
   * aceptación se rechaza en vez de guardarse sobre un texto que nadie puede
   * recuperar después.
   */
  findVersion(
    code: LegalDocumentCode,
    version: string,
    manager?: EntityManager,
  ): Promise<LegalDocument | null>;

  /** Historial completo de un documento, para la página de versiones. */
  listHistory(
    code: LegalDocumentCode,
    manager?: EntityManager,
  ): Promise<LegalDocument[]>;
}
