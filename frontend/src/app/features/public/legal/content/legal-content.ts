import type { Language } from '@/core/i18n/i18n.config';
import { fillIdentityTokens } from '@/shared/catalogs/legal.catalogs';
import type { LegalContentKey, LegalDocumentContent } from './legal-content.models';
import { LEGAL_CONTENT_EN } from './legal-content.en';
import { LEGAL_CONTENT_ES } from './legal-content.es';

export type { LegalContentKey, LegalDocumentContent } from './legal-content.models';

/** Clave de contenido ↔ código de documento del backend. */
export const CONTENT_BY_DOC_CODE = {
  TERMS: 'terms',
  PRIVACY: 'privacy',
  COOKIES: 'cookies',
  REFUND: 'refund',
  IMAGE_RIGHTS: 'imageRights',
  MARKETING: 'privacy',
} as const satisfies Record<string, LegalContentKey>;

const BY_LANGUAGE = {
  es: LEGAL_CONTENT_ES,
  en: LEGAL_CONTENT_EN,
} as const;

/**
 * Sustituye los marcadores del responsable en todo el contenido.
 *
 * El documento guarda párrafos, listas y bloques de HTML, así que el recorrido
 * es genérico: cualquier texto que lleve un `{{...}}` lo sustituye. Se hace
 * sobre una copia porque los catálogos son constantes compartidas y el texto
 * publicado no puede mutar entre navegaciones.
 */
function fillContent<T>(content: T): T {
  if (typeof content === 'string') {
    return fillIdentityTokens(content) as T;
  }
  if (Array.isArray(content)) {
    return content.map((item) => fillContent(item)) as T;
  }
  if (content && typeof content === 'object') {
    return Object.fromEntries(
      Object.entries(content as Record<string, unknown>).map(([key, value]) => [
        key,
        fillContent(value),
      ]),
    ) as T;
  }
  return content;
}

/**
 * Contenido del documento en el idioma activo.
 *
 * Si el inglés llegara a faltar un documento, esto devuelve el español en vez
 * de `undefined`. El motivo es que un documento legal vacío es peor que uno en
 * otro idioma: una plantilla vacía rompe el build, pero una que reserva al
 * usuario sin comunicarle nada en su idioma es un incumplimiento silencioso.
 * `legal-content.spec.ts` falla si los dos idiomas dejan de estar parejos, así
 * que el respaldo no debería activarse nunca en la práctica.
 */
export function legalContent(
  key: LegalContentKey,
  language: Language,
): LegalDocumentContent {
  return fillContent(BY_LANGUAGE[language]?.[key] ?? LEGAL_CONTENT_ES[key]);
}