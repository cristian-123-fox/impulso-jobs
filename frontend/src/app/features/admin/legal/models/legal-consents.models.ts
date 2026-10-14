/**
 * Tipos del back-office de consentimientos, derivados del Swagger de
 * `GET /admin/legal-consents`.
 */

export type LegalDocCodeWire =
  | 'TERMS'
  | 'PRIVACY'
  | 'COOKIES'
  | 'REFUND'
  | 'IMAGE_RIGHTS'
  | 'MARKETING';

export type ConsentMethodWire =
  | 'TACIT'
  | 'EXPRESS_CHECKBOX'
  | 'EXPRESS_WRITTEN';

export type ConsentSourceWire =
  | 'REGISTRATION'
  | 'GOOGLE_REGISTRATION'
  | 'LOGIN'
  | 'CONTACT_FORM'
  | 'NEWSLETTER'
  | 'VACANCY_APPLICATION'
  | 'VACANCY_REPORT'
  | 'PROFILE_PHOTO'
  | 'RESUME_DOWNLOAD'
  | 'CHECKOUT'
  | 'SUBSCRIPTION'
  | 'TERMS_PAGE'
  | 'ACCOUNT_SETTINGS'
  | 'COOKIE_BANNER';

/** Una fila del registro. Es un hecho pasado, no un estado editable. */
export interface AdminLegalConsent {
  id: string;
  subjectEmail: string | null;
  documentCode: LegalDocCodeWire;
  documentVersion: string;
  granted: boolean;
  consentMethod: ConsentMethodWire;
  source: ConsentSourceWire;
  ip: string | null;
  userAgent: string | null;
  consentedAt: string;
  metadata: Record<string, unknown> | null;
  /** true si la decisión se tomó con sesión iniciada. */
  hasSession: boolean;
}

/**
 * Cifras de la cabecera.
 *
 * `granted`/`denied` son **históricas** —cuántas filas hay de cada tipo—, mientras
 * que `active*` son **vigentes**: titulares cuya última decisión sobre ese
 * documento fue aceptarlo. No coinciden, porque revocar inserta una fila nueva en
 * lugar de borrar la anterior.
 */
export interface ConsentSummary {
  total: number;
  granted: number;
  denied: number;
  activeTerms: number;
  activePrivacy: number;
  activeImageRights: number;
}

export interface AdminConsentsPage {
  items: AdminLegalConsent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  summary: ConsentSummary;
}

/** Filtros del listado. Vacío = todos. */
export interface AdminConsentsQuery {
  page: number;
  limit: number;
  search?: string;
  documentCode?: LegalDocCodeWire;
  granted?: boolean;
  source?: ConsentSourceWire;
  sortBy?: 'consentedAt' | 'document' | 'email' | 'source';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Los cinco documentos que puede dar de alta una persona. `MARKETING` se queda
 * fuera del selector: no se acepta ni se rechaza por separado, viaja siempre
 * ligado a su casilla.
 */
export const CONSENT_DOCUMENT_FILTERS: readonly {
  value: LegalDocCodeWire;
  label: string;
}[] = [
  { value: 'TERMS', label: 'Términos y condiciones' },
  { value: 'PRIVACY', label: 'Aviso de privacidad' },
  { value: 'COOKIES', label: 'Cookies' },
  { value: 'IMAGE_RIGHTS', label: 'Cesión de imagen' },
  { value: 'MARKETING', label: 'Comunicaciones comerciales' },
  { value: 'REFUND', label: 'Política de reembolso' },
];

/** Etiquetas de `source`, para no pintar el nombre crudo del enum. */
export const CONSENT_SOURCE_LABELS: Readonly<Record<ConsentSourceWire, string>> =
  {
    REGISTRATION: 'Alta de cuenta',
    GOOGLE_REGISTRATION: 'Alta con Google',
    LOGIN: 'Inicio de sesión',
    CONTACT_FORM: 'Formulario de contacto',
    NEWSLETTER: 'Newsletter',
    VACANCY_APPLICATION: 'Postulación a vacante',
    VACANCY_REPORT: 'Denuncia de vacante',
    PROFILE_PHOTO: 'Foto de perfil',
    RESUME_DOWNLOAD: 'Descarga de CV',
    CHECKOUT: 'Compra de promoción',
    SUBSCRIPTION: 'Suscripción',
    TERMS_PAGE: 'Página de documentos',
    ACCOUNT_SETTINGS: 'Ajustes de cuenta',
    COOKIE_BANNER: 'Banner de cookies',
  };

/** Etiquetas de `consentMethod`. */
export const CONSENT_METHOD_LABELS: Readonly<
  Record<ConsentMethodWire, string>
> = {
  TACIT: 'Tácito',
  EXPRESS_CHECKBOX: 'Casilla expresa',
  EXPRESS_WRITTEN: 'Casilla con constancia escrita',
};