import { IDENTITY_DOCUMENT_CODES } from '@/common/catalogs/identity-documents';

/**
 * Tipo de documento de identidad del aspirante (T36). Los códigos llevan
 * prefijo de país **salvo el pasaporte**, que es el mismo documento en los
 * cuatro (decisión D-2); el país emisor viaja en `document_country`.
 *
 * ⚠️ **Cambió de valores.** Hasta T36 eran `CURP` / `RFC` / `INE` /
 * `Pasaporte`; la migración `1720000031000` remapeó las filas existentes. Si
 * encuentras una comparación con los valores viejos, es un resto.
 *
 * El catálogo con las etiquetas y los formatos vive en
 * `common/catalogs/identity-documents.ts`, que es de donde sale la lista que
 * valida `@IsIn`: el enum son sólo las constantes con nombre.
 */
export enum DocumentType {
  MX_CURP = 'MX_CURP',
  MX_RFC = 'MX_RFC',
  MX_INE = 'MX_INE',
  CO_CC = 'CO_CC',
  CO_CE = 'CO_CE',
  CO_PPT = 'CO_PPT',
  US_DL = 'US_DL',
  CA_DL = 'CA_DL',
  PASSPORT = 'PASSPORT',
}

/** Lista para `@IsIn` / Swagger. Sale del catálogo, que es el único origen. */
export const DOCUMENT_TYPES: readonly string[] = IDENTITY_DOCUMENT_CODES;
