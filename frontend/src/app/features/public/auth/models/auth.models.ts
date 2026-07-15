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
