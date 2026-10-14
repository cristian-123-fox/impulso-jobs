/**
 * Identidad del responsable y catálogo de documentos legales.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(negocio) — **BLOQUEANTE ANTES DE PUBLICAR.**
 *
 * Los campos marcados `[PENDIENTE]` son datos que sólo tú tienes. Están aquí,
 * juntos y en un solo archivo, precisamente para que rellenarlos sea un cambio
 * de un minuto y no una búsqueda por todo el código.
 *
 * El artículo 15 fracción I de la LFPDPPP exige que el aviso de privacidad
 * identifique **al responsable y su domicilio**, y el artículo 128 de la LFPC
 * impone multas de hasta $4.27 millones MXN por no informar los datos del
 * proveedor antes de una venta. Publicar con estos marcadores puestos es una
 * infracción previsible, no un detalle de estilo.
 *
 * Cómo rellenarlo: sustituye cada `[PENDIENTE]` por su valor. No hace falta
 * tocar ningún otro archivo — el aviso de privacidad, los términos, las
 * casillas de los formularios y el pie leen todos de aquí.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Datos que la ley exige identificar. `PENDING_TOKEN` se usa como centinela:
 * `isIdentityComplete()` lo detecta y las plantillas pueden avisar en vez de
 * imprimir un marcador suelto.
 */
export const PENDING_TOKEN = '[PENDIENTE]';

export interface LegalIdentity {
  /** Razón social o nombre del responsable. Sin abreviar. */
  readonly legalName: string;
  /** Nombre comercial bajo el que opera, si difiere. */
  readonly tradeName?: string;
  /** RFC del responsable. Trece posiciones para persona moral. */
  readonly rfc: string;
  /** Domicilio fiscal completo, como aparece en la constancia de situación. */
  readonly fiscalAddress: string;
  /** Domicilio físico donde se exercise el giro (art. 76 Bis fr. III LFPC). */
  readonly operatingAddress?: string;
  /**
   * Persona o departamento de datos personales que recibe las solicitudes ARCO
   * (art. 29 LFPDPPP: "designar a una persona, o departamento de datos
   * personales"). Poner un correo genérico de soporte es admisible, pero uno
   * dedicado es lo que la ley pide.
   */
  readonly dataProtectionContact: string;
  /** Teléfono para aclaraciones y reclamaciones (art. 76 Bis fr. III LFPC). */
  readonly consumerPhone: string;
  /** Correo para reclamaciones y notices de derechos de autor. */
  readonly consumerEmail: string;
}

export const LEGAL_IDENTITY: LegalIdentity = {
  legalName: PENDING_TOKEN,
  tradeName: 'Impulso Jobs',
  rfc: PENDING_TOKEN,
  fiscalAddress: PENDING_TOKEN,
  operatingAddress: PENDING_TOKEN,
  dataProtectionContact: PENDING_TOKEN,
  consumerPhone: PENDING_TOKEN,
  consumerEmail: PENDING_TOKEN,
};

/** `false` mientras falte un dato obligatorio: las plantillas lo señalan. */
export function isIdentityComplete(): boolean {
  return [
    LEGAL_IDENTITY.legalName,
    LEGAL_IDENTITY.rfc,
    LEGAL_IDENTITY.fiscalAddress,
    LEGAL_IDENTITY.dataProtectionContact,
    LEGAL_IDENTITY.consumerEmail,
  ].every((value) => value.trim() !== PENDING_TOKEN && value.trim() !== '');
}

/**
 * Marcador del texto publicado ↔ campo del responsable.
 *
 * Los documentos van escritos con `{{RFC}}` y compañía, no con el dato pegado:
 * el valor cambia —y cambia sin que nadie avise— mientras el texto se reutiliza en
 * los dos idiomas y en los PDF.
 */
const IDENTITY_TOKENS: Readonly<Record<string, keyof LegalIdentity>> = {
  LEGAL_NAME: 'legalName',
  TRADE_NAME: 'tradeName',
  RFC: 'rfc',
  FISCAL_ADDRESS: 'fiscalAddress',
  OPERATING_ADDRESS: 'operatingAddress',
  DPO_EMAIL: 'dataProtectionContact',
  CONSUMER_PHONE: 'consumerPhone',
  CONSUMER_EMAIL: 'consumerEmail',
};

const TOKEN_PATTERN = /\{\{([A-Z_]+)\}\}/g;

/**
 * Sustituye los marcadores por los datos del responsable.
 *
 * Un marcador sin campo asociado se deja tal cual: es un error de redacción que
 * debe verse, no taparse.
 */
export function fillIdentityTokens(text: string): string {
  return text.replace(TOKEN_PATTERN, (match, token: string) => {
    const field = IDENTITY_TOKENS[token];
    if (!field) return match;
    const value = LEGAL_IDENTITY[field];
    return value?.trim() ? value : match;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de documentos
// ─────────────────────────────────────────────────────────────────────────────

/** Espejo de `LegalDocumentCode` en `backend/src/modules/legal/enums`. */
export enum LegalDocCode {
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY',
  COOKIES = 'COOKIES',
  REFUND = 'REFUND',
  IMAGE_RIGHTS = 'IMAGE_RIGHTS',
  MARKETING = 'MARKETING',
}

export interface LegalDocDefinition {
  readonly code: LegalDocCode;
  /** Ruta pública de la página. Cambiarla rompe enlaces ya publicados. */
  readonly route: string;
  /**
   * Copia descargable en PDF, servida como archivo estático de `public/`.
   *
   * Opcional a propósito: no todos los documentos la tienen, y un enlace a un
   * archivo que no existe es peor que no ofrecer descarga.
   *
   * ⚠️ **El PDF y la página tienen que decir lo mismo.** La página es la versión
   * canónica —versionada, con índice, traducida y enlazada desde el registro de
   * consentimiento—; el PDF es una copia para quien la quiera en papel. Si
   * divergen, hay dos documentos legales distintos con el mismo nombre en el
   * mismo sitio, y eso es peor que no tener ninguno. Al regenerar uno hay que
   * regenerar el otro en el mismo commit.
   */
  readonly pdf?: string;
  /** Versión que el backend tiene registrada como vigente. */
  readonly version: string;
  /** Fecha de entrada en vigor, formato ISO. */
  readonly effectiveDate: string;
  /** Clave de traducción del título en el menú y las casillas. */
  readonly titleKey: string;
  /**
   * Si `true`, no se puede usar el servicio sin aceptarlo. Es lo que
   * corresponde con `blocks_registration` en `legal_documents`.
   */
  readonly required: boolean;
}

/**
 * Un solo lugar donde cambiar una versión.
 *
 * **Al revisar un documento hay que tocar dos cosas en el mismo commit:** esta
 * tabla y la migración que marca la versión nueva como vigente en
 * `legal_documents`. Si sólo se cambia una, la API devuelve
 * `LEGAL_DOCUMENT_VERSION_UNKNOWN` y el registro de consentimiento se rechaza —
 * que es el comportamiento correcto, pero corta el alta de cuentas.
 */
export const LEGAL_DOCUMENTS: readonly LegalDocDefinition[] = [
  {
    code: LegalDocCode.PRIVACY,
    route: '/legal/aviso-de-privacidad',
    pdf: '/legal/politica-privacidad.pdf',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.privacy',
    required: true,
  },
  {
    code: LegalDocCode.TERMS,
    route: '/legal/terminos-y-condiciones',
    pdf: '/legal/terminos-condiciones.pdf',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.terms',
    required: true,
  },
  {
    code: LegalDocCode.COOKIES,
    route: '/legal/politica-de-cookies',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.cookies',
    required: false,
  },
  {
    code: LegalDocCode.REFUND,
    route: '/legal/politica-de-reembolso',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.refund',
    required: false,
  },
  {
    code: LegalDocCode.IMAGE_RIGHTS,
    route: '/legal/cesion-de-derechos-de-imagen',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.imageRights',
    required: false,
  },
  {
    code: LegalDocCode.MARKETING,
    // Sin página propia: es un ancla dentro del aviso, en la sección que enumera
    // las finalidades. El artículo 15 fr. III pide distinguir las finalidades
    // que requieren consentimiento, y esa lista vive ahí.
    route: '/legal/aviso-de-privacidad#finalidades',
    version: '1.0.0',
    effectiveDate: '2026-10-01',
    titleKey: 'legal.documents.marketing',
    required: false,
  },
];

const BY_CODE = new Map<LegalDocCode, LegalDocDefinition>(
  LEGAL_DOCUMENTS.map((doc) => [doc.code, doc]),
);

export function legalDocument(code: LegalDocCode): LegalDocDefinition {
  const found = BY_CODE.get(code);
  if (!found) throw new Error(`Documento legal sin definir: ${code}`);
  return found;
}

/** Versión a declarar en el registro de consentimiento. */
export function versionOf(code: LegalDocCode): string {
  return legalDocument(code).version;
}

/** Rutas de los documentos que se muestran en el pie. */
export const LEGAL_FOOTER_LINKS: readonly LegalDocDefinition[] =
  LEGAL_DOCUMENTS.filter((doc) => doc.code !== LegalDocCode.MARKETING);