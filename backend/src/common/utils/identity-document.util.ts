import {
  documentByCode,
  isDocumentAllowedIn,
} from '@/common/catalogs/identity-documents';

/**
 * Formato del número de documento de identidad, por país y tipo (T36).
 *
 * Reglas del frontend en paralelo:
 * `frontend/src/app/shared/validators/identity-document.validator.ts`. **Los dos
 * se editan a la vez**; el backend es la autoridad (decisión D-7).
 */

/**
 * Deja el número como se almacena: mayúsculas y sólo alfanuméricos. Quita los
 * puntos de una cédula colombiana (`1.020.123.456`), los espacios de un
 * pasaporte y los guiones de una licencia.
 */
export function normalizeDocumentNumber(
  _type: string | null | undefined,
  raw: string | null | undefined,
): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * ¿El número encaja con el tipo, y el tipo con el país emisor?
 *
 * Comprueba **las dos cosas** a propósito, para que no sirva de nada llamarla
 * sin haber validado antes la combinación. El validador de DTO sí las separa
 * (primero `isDocumentAllowedIn`, luego esto), porque los mensajes de error son
 * distintos y el usuario tiene que saber cuál de las dos falló.
 */
export function isValidDocumentNumber(
  country: string | null | undefined,
  type: string | null | undefined,
  documentNumber: string | null | undefined,
): boolean {
  if (!isDocumentAllowedIn(country, type)) return false;
  const document = documentByCode(type);
  if (!document) return false;
  const value = normalizeDocumentNumber(type, documentNumber);
  return value.length > 0 && document.pattern.test(value);
}
