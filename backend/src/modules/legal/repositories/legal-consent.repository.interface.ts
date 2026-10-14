import { EntityManager } from 'typeorm';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';

export const LEGAL_CONSENT_REPOSITORY = 'LEGAL_CONSENT_REPOSITORY';

/** Filtros del listado administrativo de consentimientos. */
export interface ConsentSearchCriteria {
  page: number;
  limit: number;
  search?: string;
  documentCode?: LegalDocumentCode;
  /** `true` sólo aceptaciones, `false` sólo negativas y revocaciones. */
  granted?: boolean;
  source?: string;
  sortBy?: ConsentSortKey;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Columnas ordenables, y la propiedad de la entidad a la que corresponde cada
 * una. Es una lista blanca: lo que no esté aquí no llega al `ORDER BY` (ver
 * `buildOrder`).
 */
export const CONSENT_SORT_COLUMNS = {
  consentedAt: 'createdAt',
  document: 'documentCode',
  email: 'subjectEmail',
  source: 'source',
} as const;

export const CONSENT_SORT_KEYS = Object.keys(CONSENT_SORT_COLUMNS);

export type ConsentSortKey = (keyof typeof CONSENT_SORT_COLUMNS)[number];

/**
 * Sólo `create` y las lecturas. No hay `update` ni `delete`, y es deliberado: un
 * registro de aceptación es un hecho pasado, y reescribirlo lo convierte en una
 * afirmación sin respaldo. Por eso revocar se resuelve insertando otra fila.
 */
export interface ILegalConsentRepository {
  /** Inserta. La única forma de dejar constancia. */
  create(
    consent: Partial<LegalConsent>,
    manager?: EntityManager,
  ): Promise<void>;

  /**
   * Historial del titular, del más reciente al más antiguo. Incluye las
   * revocaciones, que llegan como filas propias con `granted = false`.
   */
  listBySubject(
    userId: string | null,
    subjectEmail: string | null,
    limit: number,
  ): Promise<LegalConsent[]>;

  /** Hay una aceptación vigente (y no revocada después) de este documento. */
  hasActiveConsent(
    userId: string | null,
    subjectEmail: string | null,
    documentCode: LegalDocumentCode,
  ): Promise<boolean>;

  /**
   * Última decisión del titular en cada uno de los documentos indicados: una
   * fila por código, la más reciente, marcada o no.
   *
   * Es lo que necesita el re-consentimiento: comparar `documentVersion` con la
   * versión vigente. No basta con preguntar si aceptó —`hasActiveConsent`—, que
   * seguiría diciendo `true` con una aceptación de la v1.0 y los documentos ya
   * en la v1.1. La última fila manda, así que una revocación posterior se lee
   * como `granted = false` sin tratarla aparte.
   */
  findLatestByCodes(
    userId: string | null,
    subjectEmail: string | null,
    documentCodes: readonly LegalDocumentCode[],
  ): Promise<LegalConsent[]>;

  /** Listado paginado del back-office. */
  findAndCount(
    criteria: ConsentSearchCriteria,
  ): Promise<[LegalConsent[], number]>;

  /**
   * Recuento por documento y por `granted`, para las tarjetas de resumen.
   *
   * Se cuenta en SQL y no en memoria a partir del listado: la tabla va a crecer
   * sin parar y el encabezado tiene que decir lo mismo con diez mil filas que con
   * diez.
   */
  summarize(
    criteria: Omit<
      ConsentSearchCriteria,
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): Promise<ConsentSummary>;
}

/** Cifras del encabezado: cuántas decisiones hay de cada tipo. */
export interface ConsentSummary {
  /** Filas que casan con el filtro, con el buscador o sin él. */
  total: number;
  granted: number;
  denied: number;
  /**
   * Aceptaciones vigentes de cada documento: la última fila de cada titular con
   * `granted = true` y sin una negativa posterior.
   *
   * Es el número que de verdad importa, y no es contar las filas con
   * `granted = true`: revocar inserta una fila nueva, así que ese recuento es
   * histórico y no vigente.
   */
  activeTerms: number;
  activePrivacy: number;
  activeImageRights: number;
}
