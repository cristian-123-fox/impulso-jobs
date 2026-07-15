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

/** Estado de la pantalla de verificación de correo (verify-email). */
export type VerifyState = 'verifying' | 'success' | 'invalid';

/** Estado del reenvío de verificación desde la pantalla de verify. */
export type VerifyResendStatus = 'idle' | 'loading' | 'sent';

/** Datos de empresa para el registro (México). */
export interface RegisterCompanyData {
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  economicSector?: string;
  website?: string;
  country?: string;
  state: string;
  municipality: string;
}

/** Datos de candidato para el registro (México). */
export interface RegisterCandidateData {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  curp?: string;
  birthDate: string;
  professionalTitle?: string;
  country?: string;
  state: string;
  municipality: string;
}

export interface RegisterCompanyPayload {
  accountType: 'company';
  email: string;
  password: string;
  company: RegisterCompanyData;
}

export interface RegisterCandidatePayload {
  accountType: 'candidate';
  email: string;
  password: string;
  candidate: RegisterCandidateData;
}

export type RegisterPayload = RegisterCompanyPayload | RegisterCandidatePayload;

export interface RegisterResult {
  userId: string;
  email: string;
  accountType: 'company' | 'candidate';
  verificationRequired: boolean;
}

export type RegisterStatus = 'idle' | 'loading' | 'success';
