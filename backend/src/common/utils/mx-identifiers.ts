/**
 * Validadores de identificadores fiscales mexicanos (formato, no dígito
 * verificador). Se normaliza a mayúsculas antes de validar/almacenar.
 */

/** RFC: 3 letras (moral) o 4 (física) + 6 dígitos de fecha + 3 de homoclave. */
export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/** CURP: 18 caracteres con estructura oficial (sin validar entidad exacta). */
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;

/** Código postal mexicano: 5 dígitos. */
export const MX_POSTAL_CODE_REGEX = /^\d{5}$/;

export function normalizeRfc(rfc: string): string {
  return rfc.trim().toUpperCase();
}

export function isValidRfc(rfc: string): boolean {
  const value = normalizeRfc(rfc);
  return RFC_REGEX.test(value) && (value.length === 12 || value.length === 13);
}

export function isValidCurp(curp: string): boolean {
  return CURP_REGEX.test(curp.trim().toUpperCase());
}

export function isValidMxPostalCode(code: string): boolean {
  return MX_POSTAL_CODE_REGEX.test(code);
}
