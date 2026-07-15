import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Mismos formatos que el backend (RFC 12/13, CURP 18, C.P. 5 dígitos). */
export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;
export const MX_POSTAL_CODE_REGEX = /^\d{5}$/;

/** Valida el formato de RFC (normaliza a mayúsculas). `{ rfc: true }` si falla. */
export function rfcValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string) ?? '';
  if (!value) return null;
  return RFC_REGEX.test(value.trim().toUpperCase()) ? null : { rfc: true };
}

/** Valida el formato de CURP (opcional; normaliza a mayúsculas). */
export function curpValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = (control.value as string) ?? '';
  if (!value) return null;
  return CURP_REGEX.test(value.trim().toUpperCase()) ? null : { curp: true };
}

/** Valida el código postal mexicano (5 dígitos). */
export function postalCodeValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = (control.value as string) ?? '';
  if (!value) return null;
  return MX_POSTAL_CODE_REGEX.test(value) ? null : { postalCode: true };
}

/** Valida que la fecha no sea futura. `{ futureDate: true }` si lo es. */
export function notFutureDateValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { invalidDate: true };
  return date.getTime() > Date.now() ? { futureDate: true } : null;
}
