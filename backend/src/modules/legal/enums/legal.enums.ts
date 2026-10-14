/**
 * Vocabulario cerrado del dominio legal. Los valores viajan al cliente dentro de
 * `legal_consents` y son evidencia: si mañana se reescriben, las aceptaciones
 * viejas quedan ilegibles. Por eso son cadenas y no `number`, y no se deben
 * renombrar sin una migración que conserve el histórico.
 */

/**
 * Documentos legales versionados.
 *
 * El código NO cambia aunque cambie el contenido: unos `TERMS` de la v1.0 a la
 * v3.0 siguen siendo `TERMS`. Es lo que permite saber, años después, qué ley
 * estaba vigente el día que alguien aceptó.
 */
export enum LegalDocumentCode {
  /** Términos y condiciones: contrato de adhesión (art. 85 LFPC). */
  TERMS = 'TERMS',
  /** Aviso de privacidad integral y modalidad simplificada (arts. 15 y 16). */
  PRIVACY = 'PRIVACY',
  /** Política de cookies y tecnologías de recabado automático. */
  COOKIES = 'COOKIES',
  /** Política de reembolso y cancelación. */
  REFUND = 'REFUND',
  /** Cesión de derechos de uso de imagen del candidato. */
  IMAGE_RIGHTS = 'IMAGE_RIGHTS',
  /**
   * Autorización para comunicaciones comerciales (newsletter, vacantes
   * similares). Va como documento propio y no como metadato porque el art. 15
   * fracción III de la LFPDPPP obliga a distinguir qué finalidades requieren
   * consentimiento, y eso sólo se puede cumplir si la negativa queda en su
   * propia fila.
   */
  MARKETING = 'MARKETING',
}

/**
 * Dónde se pidió el consentimiento. Es el "cómo" que la persona titular puede
 * exigir que se le demuestre: un alta de cuenta, un clic en una casilla o la
 * mera navegación hasta el final de un documento.
 */
export enum ConsentSource {
  REGISTRATION = 'REGISTRATION',
  GOOGLE_REGISTRATION = 'GOOGLE_REGISTRATION',
  LOGIN = 'LOGIN',
  CONTACT_FORM = 'CONTACT_FORM',
  NEWSLETTER = 'NEWSLETTER',
  VACANCY_APPLICATION = 'VACANCY_APPLICATION',
  VACANCY_REPORT = 'VACANCY_REPORT',
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  RESUME_DOWNLOAD = 'RESUME_DOWNLOAD',
  CHECKOUT = 'CHECKOUT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  TERMS_PAGE = 'TERMS_PAGE',
  ACCOUNT_SETTINGS = 'ACCOUNT_SETTINGS',
  COOKIE_BANNER = 'COOKIE_BANNER',
}

/**
 * Cómo se EXPRESSO el consentimiento. Tres categorías y ni una más, porque la
 * distinción que importa para la LFPDPPP es esta:
 *
 * - `TACIT`: el titular ya tuvo el aviso a la vista y no se opuso (art. 7,
 *   párrafo tercero). Vale para finalidades primarias y datos no sensibles.
 * - `EXPRESS_CHECKBOX`: acción afirmativa sobre una casilla no preseleccionada.
 *   Es lo que la ley llama "signos inequívocos", y lo que exige la LFPC
 *   76 Bis fracción VIII para el cobro recurrente.
 * - `EXPRESS_WRITTEN`: acción afirmativa que además deja constancia del texto
 *   aceptado (momento, IP, versión y huella del documento). Es el nivel que pide
 *   el art. 8 para datos sensibles y el que conviene en un contrato de
 *   adhesión; en la web se satisface con la casilla más el registro.
 */
export enum ConsentMethod {
  TACIT = 'TACIT',
  EXPRESS_CHECKBOX = 'EXPRESS_CHECKBOX',
  EXPRESS_WRITTEN = 'EXPRESS_WRITTEN',
}
