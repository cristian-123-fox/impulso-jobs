import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  documentByCode,
  isDocumentAllowedIn,
  isValidSubdivision,
} from '@/shared/catalogs/countries.catalogs';

/**
 * Formato del número de documento, por país y tipo (T36). Espejo de
 * `backend/src/common/utils/identity-document.util.ts`: **los dos se editan a la
 * vez**, y el backend sigue siendo quien decide (D-7).
 */

/** Mayúsculas y sólo alfanuméricos: quita puntos, espacios y guiones. */
export function normalizeDocumentNumber(
  raw: string | null | undefined,
): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Valida el número contra el formato de `type` emitido por `country`.
 *
 * ⚠️ **País y tipo se capturan al crear el validador**, así que cuando cambian
 * hay que volver a aplicarlo:
 *
 * ```ts
 * const control = this.form.controls.documentNumber;
 * control.setValidators([Validators.required, documentNumberValidator(country, type)]);
 * control.updateValueAndValidity();
 * ```
 *
 * Es justo el sitio donde el formulario ya limpia el control al cambiar de país
 * (§ 7.3 punto 3), así que no añade un paso nuevo.
 */
export function documentNumberValidator(
  country: string | null | undefined,
  type: string | null | undefined,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = normalizeDocumentNumber(control.value as string);
    if (!value) return null;

    const document = documentByCode(type);
    if (!document) return null; // Sin tipo elegido todavía no hay nada que validar.
    if (!isDocumentAllowedIn(country, type)) return { documentCountry: true };

    return document.pattern.test(value) ? null : { documentNumber: true };
  };
}

/**
 * Valida que la subdivisión elegida pertenezca al país. Es la red para el caso
 * en que el desplegable no se limpió al cambiar de país: sin ella, el usuario
 * sólo se entera por un 400 del servidor. Se vuelve a aplicar igual que
 * `documentNumberValidator`.
 */
export function subdivisionValidator(
  country: string | null | undefined,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value as string) ?? '').trim();
    if (!value) return null;
    return isValidSubdivision(country, value) ? null : { subdivision: true };
  };
}
