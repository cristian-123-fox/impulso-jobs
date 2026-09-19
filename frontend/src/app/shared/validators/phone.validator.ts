import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizePhone, type IjPhoneValue } from '@/shared/utils/phone';

/**
 * Validadores del teléfono de `ij-phone-input` (T36).
 *
 * El valor del control es un `IjPhoneValue`, así que **`Validators.required` no
 * sirve**: vería siempre un objeto no nulo y daría por bueno un teléfono vacío.
 * Para un campo obligatorio se usa `phoneRequiredValidator`.
 */

function readValue(control: AbstractControl): {
  country: string | null;
  national: string;
} {
  const value = control.value as IjPhoneValue | string | null | undefined;
  if (typeof value === 'string') return { country: null, national: value };
  return {
    country: value?.country ?? null,
    national: value?.national ?? '',
  };
}

/**
 * Formato del teléfono para su país. Vacío es válido (el teléfono del aspirante
 * es opcional). `country` sólo hace falta cuando el control guarda una cadena en
 * lugar del objeto; con `ij-phone-input` el país sale del propio valor.
 */
export function phoneValidator(country?: string | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { country: own, national } = readValue(control);
    if (!national.trim()) return null;
    const target = own ?? country;
    return normalizePhone(target, national) ? null : { phone: true };
  };
}

/** Igual que `phoneValidator`, pero el campo vacío es error (`{ required: true }`). */
export function phoneRequiredValidator(country?: string | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { country: own, national } = readValue(control);
    if (!national.trim()) return { required: true };
    const target = own ?? country;
    return normalizePhone(target, national) ? null : { phone: true };
  };
}
