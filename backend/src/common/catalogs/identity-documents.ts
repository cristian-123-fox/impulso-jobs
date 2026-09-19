import { type CountryCode } from '@/common/catalogs/countries';
import { CURP_REGEX, RFC_REGEX } from '@/common/utils/mx-identifiers';

/**
 * Documentos de identidad que un aspirante puede presentar, por país (T36).
 *
 * **Los códigos llevan prefijo de país, salvo el pasaporte** (decisión D-2): la
 * lista de `@IsIn` queda plana y explícita, y un mismo código no puede
 * significar cosas distintas según el país. El pasaporte va sin prefijo porque
 * es **el mismo documento** en los cuatro; el país emisor viaja en
 * `candidate_profiles.document_country`.
 *
 * ⚠️ **Ni SSN ni SIN.** Para Estados Unidos y Canadá no se ofrece el número de
 * seguridad social. En Canadá la guía de la oficina del Privacy Commissioner
 * bajo PIPEDA desaconseja pedir el SIN a un candidato **antes de contratarlo**;
 * en Estados Unidos el SSN es el identificador con mayor riesgo de robo de
 * identidad y guardarlo obliga a controles que esta plataforma no tiene.
 * Licencia de conducir y pasaporte cubren el caso de uso real —identificar a la
 * persona— sin ese riesgo. **Esta decisión no se revierte sin pasar por el
 * negocio y por una revisión de seguridad.**
 *
 * Se valida **formato, no autenticidad**: ni dígito verificador de la cédula
 * colombiana ni homoclave del RFC, igual que hoy para México.
 *
 * Espejo en el frontend: `frontend/src/app/shared/catalogs/countries.catalogs.ts`.
 */
export interface IdentityDocument {
  /** Valor almacenado en `candidate_profiles.document_type`. */
  code: string;
  /** Etiqueta en español. El frontend la traduce (D-9). */
  label: string;
  /** Países que lo emiten. El pasaporte vale en los cuatro. */
  countries: readonly CountryCode[];
  /** Formato aceptado, sobre el número ya normalizado (mayúsculas, sin signos). */
  pattern: RegExp;
}

export const IDENTITY_DOCUMENTS = [
  {
    code: 'MX_CURP',
    label: 'CURP',
    countries: ['MX'],
    pattern: CURP_REGEX,
  },
  {
    code: 'MX_RFC',
    label: 'RFC',
    countries: ['MX'],
    pattern: RFC_REGEX,
  },
  {
    code: 'MX_INE',
    label: 'Clave de elector (INE)',
    countries: ['MX'],
    pattern: /^[A-Z0-9]{18}$/,
  },
  {
    code: 'CO_CC',
    label: 'Cédula de ciudadanía',
    countries: ['CO'],
    pattern: /^\d{6,10}$/,
  },
  {
    code: 'CO_CE',
    label: 'Cédula de extranjería',
    countries: ['CO'],
    pattern: /^\d{6,7}$/,
  },
  {
    code: 'CO_PPT',
    label: 'Permiso por Protección Temporal',
    countries: ['CO'],
    pattern: /^\d{7,9}$/,
  },
  {
    code: 'US_DL',
    label: "Driver's License / State ID",
    countries: ['US'],
    pattern: /^[A-Z0-9]{4,20}$/,
  },
  {
    code: 'CA_DL',
    label: "Driver's Licence / Provincial ID",
    countries: ['CA'],
    pattern: /^[A-Z0-9]{4,20}$/,
  },
  {
    code: 'PASSPORT',
    label: 'Pasaporte',
    countries: ['MX', 'CO', 'US', 'CA'],
    pattern: /^[A-Z0-9]{5,20}$/,
  },
] as const satisfies readonly IdentityDocument[];

export type IdentityDocumentCode = (typeof IDENTITY_DOCUMENTS)[number]['code'];

export const IDENTITY_DOCUMENT_CODES: readonly IdentityDocumentCode[] =
  IDENTITY_DOCUMENTS.map((document) => document.code);

export function documentByCode(
  code: string | null | undefined,
): IdentityDocument | undefined {
  if (!code) return undefined;
  const value = code.trim().toUpperCase();
  return IDENTITY_DOCUMENTS.find((document) => document.code === value);
}

/** Documentos que ese país emite, en el orden del catálogo. */
export function documentsOf(
  country: string | null | undefined,
): readonly IdentityDocument[] {
  const code = country?.trim().toUpperCase();
  if (!code) return [];
  return IDENTITY_DOCUMENTS.filter((document) =>
    (document.countries as readonly string[]).includes(code),
  );
}

/**
 * ¿Ese tipo de documento aplica a ese país? El backend **no puede fiarse** de
 * que el frontend filtró la lista: un `POST` a mano con `country: 'CO'` y
 * `documentType: 'MX_CURP'` tiene que rechazarse aquí.
 */
export function isDocumentAllowedIn(
  country: string | null | undefined,
  type: string | null | undefined,
): boolean {
  const document = documentByCode(type);
  if (!document) return false;
  const code = country?.trim().toUpperCase();
  return (
    code !== undefined &&
    (document.countries as readonly string[]).includes(code)
  );
}
