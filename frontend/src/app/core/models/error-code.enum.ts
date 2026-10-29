/** Códigos de error estables del contrato de la API (campo `errorCode`). */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_INACTIVE = 'AUTH_ACCOUNT_INACTIVE',
  ACCOUNT_BLOCKED = 'AUTH_ACCOUNT_BLOCKED',
  WRONG_ACCOUNT_TYPE = 'AUTH_WRONG_ACCOUNT_TYPE',
  EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN',
  TOKEN_REVOKED = 'AUTH_TOKEN_REVOKED',
  INVALID_RESET_TOKEN = 'AUTH_INVALID_RESET_TOKEN',
  PASSWORD_MISMATCH = 'AUTH_PASSWORD_MISMATCH',
  INVALID_VERIFICATION_TOKEN = 'AUTH_INVALID_VERIFICATION_TOKEN',
  EMAIL_ALREADY_VERIFIED = 'AUTH_EMAIL_ALREADY_VERIFIED',
  /** El ID token de Google no es válido, caducado o no es de este sitio. */
  GOOGLE_INVALID_TOKEN = 'AUTH_GOOGLE_INVALID_TOKEN',
  /** El backend no tiene `GOOGLE_CLIENT_ID`: el proveedor está apagado. */
  GOOGLE_NOT_CONFIGURED = 'AUTH_GOOGLE_NOT_CONFIGURED',
  /** Google verificó el correo, pero no hay cuenta: hay que registrarse. */
  GOOGLE_SIGNUP_REQUIRED = 'AUTH_GOOGLE_SIGNUP_REQUIRED',
  EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
  COMPANY_RFC_ALREADY_EXISTS = 'COMPANY_RFC_ALREADY_EXISTS',
  CANDIDATE_DOCUMENT_ALREADY_EXISTS = 'CANDIDATE_DOCUMENT_ALREADY_EXISTS',
  INVALID_BIRTH_DATE = 'INVALID_BIRTH_DATE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /**
   * Localización del aspirante (T36). El formulario **conmuta sobre estos** para
   * saltar al paso donde está el campo y marcarlo; sin ellos, un 400 del
   * validador cruzado sólo pintaría el mensaje genérico.
   */
  UNSUPPORTED_COUNTRY = 'UNSUPPORTED_COUNTRY',
  INVALID_SUBDIVISION = 'INVALID_SUBDIVISION',
  INVALID_PHONE = 'INVALID_PHONE',
  /** La cuenta existe pero hay documentos obligatorios en una versión nueva. */
  LEGAL_VERSION_OUTDATED = 'LEGAL_VERSION_OUTDATED',
  /** La cuenta nunca dejó constancia de aceptar los documentos obligatorios. */
  LEGAL_CONSENT_REQUIRED = 'LEGAL_CONSENT_REQUIRED',
  INVALID_DOCUMENT_NUMBER = 'INVALID_DOCUMENT_NUMBER',
}
