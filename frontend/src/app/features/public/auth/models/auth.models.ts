/** Tipo de cuenta elegido en el selector del login (afecta copy/redirección). */
export type AccountType = 'candidate' | 'company';

/** Datos que el formulario emite hacia la fachada. */
export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
  accountType: AccountType;
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error';
export type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';

/** Estado de la solicitud de enlace de recuperación (forgot-password). */
export type ForgotStatus = 'idle' | 'loading' | 'sent';

/** Estado de la pantalla de restablecimiento (reset-password). */
export type ResetState =
  | 'validating'
  | 'invalid'
  | 'form'
  | 'submitting'
  | 'success';

/** Datos que confirman un nuevo password contra la API. */
export interface ConfirmResetPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
