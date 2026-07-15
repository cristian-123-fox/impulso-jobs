/** Tipo de documento de identidad del candidato (México). */
export enum DocumentType {
  CURP = 'CURP',
  RFC = 'RFC',
  INE = 'INE',
  PASSPORT = 'Pasaporte',
}

export const DOCUMENT_TYPES: readonly string[] = Object.values(DocumentType);
