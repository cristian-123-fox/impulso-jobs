/** Política de contraseña (AGENTS §4.5): ≥8, mayúscula, minúscula, número y especial. */
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, e incluir mayúscula, minúscula, número y un carácter especial.';
