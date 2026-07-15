import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador a nivel de grupo: marca `{ passwordsMismatch: true }` cuando los dos
 * controles no coinciden (y ambos tienen valor).
 */
export function passwordsMatchValidator(
  passwordKey: string,
  confirmKey: string,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value as string | undefined;
    const confirm = group.get(confirmKey)?.value as string | undefined;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordsMismatch: true };
  };
}
