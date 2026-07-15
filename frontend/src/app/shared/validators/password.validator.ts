import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Misma política que el backend (≥8, mayúscula, minúscula, número, especial). */
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_HINT =
  'Mínimo 8 caracteres, con mayúscula, minúscula, número y un carácter especial.';

/** Valida la política de contraseña. Devuelve `{ passwordPolicy: true }` si falla. */
export function passwordPolicyValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return PASSWORD_POLICY_REGEX.test(value) ? null : { passwordPolicy: true };
}
