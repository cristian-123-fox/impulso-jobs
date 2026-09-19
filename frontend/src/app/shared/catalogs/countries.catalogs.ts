import { MX_STATES, type CatalogItem } from '@/shared/catalogs/mx.catalogs';
import type { IjOption } from '@/shared/ui/forms/option';

/**
 * Países en los que **un aspirante** puede registrarse, con sus subdivisiones y
 * sus documentos de identidad (T36).
 *
 * Espejo de `backend/src/common/catalogs/{countries,country-subdivisions,identity-documents}.ts`:
 * **mismo contenido y misma forma**. Los dos lados se editan a la vez; el
 * backend es la autoridad y esto sólo adelanta el mensaje al usuario.
 *
 * Catálogo embebido, sin librería de teléfonos (decisión D-8): para cuatro
 * países con longitud nacional fija cabe en una pantalla, y `libphonenumber-js`
 * son ~145 KB comprimidos en un portal con SSR y presupuestos ya ajustados por
 * CKEditor. ⚠️ **Si el alcance pasa de ~10 países, esta decisión se revisa.**
 *
 * La empresa y la vacante **siguen siendo mexicanas** (RFC, C.P., régimen SAT,
 * landings `/trabajo/<área>-en-<estado>`): esto internacionaliza al aspirante.
 */
export interface SupportedCountry {
  /** ISO 3166-1 alpha-2. Es el valor que se almacena. */
  code: string;
  /** Nombre en español, respaldo de `enums.country.<code>` (D-9). */
  name: string;
  /** Indicativo telefónico, sin `+`. ⚠️ `1` es US **y** CA (D-1). */
  dialCode: string;
  /** Dígitos del número nacional, sin indicativo. */
  nationalDigits: number;
  /** Agrupación para pintar el número (sólo presentación). */
  phoneGroups: readonly number[];
}

export const SUPPORTED_COUNTRIES = [
  // MX primero: mercado principal y país por defecto de los formularios.
  {
    code: 'MX',
    name: 'México',
    dialCode: '52',
    nationalDigits: 10,
    phoneGroups: [2, 4, 4],
  },
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '57',
    nationalDigits: 10,
    phoneGroups: [3, 3, 4],
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    dialCode: '1',
    nationalDigits: 10,
    phoneGroups: [3, 3, 4],
  },
  {
    code: 'CA',
    name: 'Canadá',
    dialCode: '1',
    nationalDigits: 10,
    phoneGroups: [3, 3, 4],
  },
] as const satisfies readonly SupportedCountry[];

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];

/**
 * Entrada concreta del catálogo. Se expone aparte de `SupportedCountry` porque
 * su `code` es `CountryCode` y no `string`: así lo que sale de `countryByCode`
 * vale donde se espera un país del alcance, sin castear ni volver a comprobar.
 */
export type SupportedCountryEntry = (typeof SUPPORTED_COUNTRIES)[number];

export const COUNTRY_CODES: readonly CountryCode[] = SUPPORTED_COUNTRIES.map(
  (country) => country.code,
);

/** País por defecto de todo formulario. Constante: **nada de detectarlo** por
 *  IP ni por `navigator.language` — el registro se sirve con SSR y una
 *  detección así daría un HTML de servidor distinto del cliente (§ 7.4). */
export const DEFAULT_COUNTRY: CountryCode = 'MX';

export function countryByCode(
  code: string | null | undefined,
): SupportedCountryEntry | undefined {
  if (!code) return undefined;
  const value = code.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.find((country) => country.code === value);
}

export function isSupportedCountry(code: unknown): code is CountryCode {
  return typeof code === 'string' && countryByCode(code) !== undefined;
}

// ---------------------------------------------------------------------------
// Subdivisiones
// ---------------------------------------------------------------------------

/**
 * ⚠️ **Los códigos de subdivisión NO son únicos entre países.** Dos colisiones
 * reales entre estos cuatro:
 *
 * - `GUA` → Guanajuato (MX) **y** Guainía (CO)
 * - `DC`  → District of Columbia (US) **y** Bogotá D.C. (CO)
 *
 * Por eso `subdivisionName` pide siempre el país. `stateBySlug()` y
 * `stateSlugOf()` de `shared/utils/seo.ts` sólo miran `MX_STATES` y siguen
 * siendo correctas —las landings son de vacantes, que son mexicanas—, pero **no
 * valen para pintar la ubicación de un aspirante**.
 *
 * Los nombres se quedan en su idioma oficial y **no se traducen** (D-9).
 */
const CO_DEPARTMENTS: readonly CatalogItem[] = [
  { code: 'AMA', name: 'Amazonas' },
  { code: 'ANT', name: 'Antioquia' },
  { code: 'ARA', name: 'Arauca' },
  { code: 'ATL', name: 'Atlántico' },
  { code: 'BOL', name: 'Bolívar' },
  { code: 'BOY', name: 'Boyacá' },
  { code: 'CAL', name: 'Caldas' },
  { code: 'CAQ', name: 'Caquetá' },
  { code: 'CAS', name: 'Casanare' },
  { code: 'CAU', name: 'Cauca' },
  { code: 'CES', name: 'Cesar' },
  { code: 'CHO', name: 'Chocó' },
  { code: 'COR', name: 'Córdoba' },
  { code: 'CUN', name: 'Cundinamarca' },
  { code: 'DC', name: 'Bogotá D.C.' },
  { code: 'GUA', name: 'Guainía' },
  { code: 'GUV', name: 'Guaviare' },
  { code: 'HUI', name: 'Huila' },
  { code: 'LAG', name: 'La Guajira' },
  { code: 'MAG', name: 'Magdalena' },
  { code: 'MET', name: 'Meta' },
  { code: 'NAR', name: 'Nariño' },
  { code: 'NSA', name: 'Norte de Santander' },
  { code: 'PUT', name: 'Putumayo' },
  { code: 'QUI', name: 'Quindío' },
  { code: 'RIS', name: 'Risaralda' },
  { code: 'SAN', name: 'Santander' },
  { code: 'SAP', name: 'San Andrés, Providencia y Santa Catalina' },
  { code: 'SUC', name: 'Sucre' },
  { code: 'TOL', name: 'Tolima' },
  { code: 'VAC', name: 'Valle del Cauca' },
  { code: 'VAU', name: 'Vaupés' },
  { code: 'VID', name: 'Vichada' },
];

const US_STATES: readonly CatalogItem[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const CA_PROVINCES: readonly CatalogItem[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

/** México se importa de `mx.catalogs.ts`: sigue siendo su único origen. */
export const SUBDIVISIONS_BY_COUNTRY: Readonly<
  Record<CountryCode, readonly CatalogItem[]>
> = {
  MX: MX_STATES,
  CO: CO_DEPARTMENTS,
  US: US_STATES,
  CA: CA_PROVINCES,
};

export function subdivisionsOf(
  country: string | null | undefined,
): readonly CatalogItem[] {
  const code = country?.trim().toUpperCase();
  if (!code || !COUNTRY_CODES.includes(code as CountryCode)) return [];
  return SUBDIVISIONS_BY_COUNTRY[code as CountryCode];
}

export function isValidSubdivision(
  country: string | null | undefined,
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  const value = code.trim().toUpperCase();
  return subdivisionsOf(country).some((item) => item.code === value);
}

/** Nombre de la subdivisión. **Siempre con el país** (`GUA`, `DC` colisionan). */
export function subdivisionName(
  country: string | null | undefined,
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const value = code.trim().toUpperCase();
  return subdivisionsOf(country).find((item) => item.code === value)?.name ?? null;
}

// ---------------------------------------------------------------------------
// Documentos de identidad
// ---------------------------------------------------------------------------

/**
 * ⚠️ **Ni SSN ni SIN** para Estados Unidos y Canadá: en Canadá la guía del
 * Privacy Commissioner bajo PIPEDA desaconseja pedir el SIN antes de contratar,
 * y en Estados Unidos el SSN obliga a controles que esta plataforma no tiene.
 * Licencia y pasaporte cubren el caso real. **No se revierte sin pasar por el
 * negocio y por una revisión de seguridad** (decisión D-2).
 */
export interface IdentityDocument {
  code: string;
  /** Etiqueta en español, respaldo de `enums.documentType.<code>` (D-9). */
  label: string;
  countries: readonly CountryCode[];
  /** Formato sobre el número ya normalizado (mayúsculas, sin signos). */
  pattern: RegExp;
}

export const IDENTITY_DOCUMENTS = [
  {
    code: 'MX_CURP',
    label: 'CURP',
    countries: ['MX'],
    pattern: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/,
  },
  {
    code: 'MX_RFC',
    label: 'RFC',
    countries: ['MX'],
    pattern: /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/,
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

export function documentsOf(
  country: string | null | undefined,
): readonly IdentityDocument[] {
  const code = country?.trim().toUpperCase();
  if (!code) return [];
  return IDENTITY_DOCUMENTS.filter((document) =>
    (document.countries as readonly string[]).includes(code),
  );
}

export function isDocumentAllowedIn(
  country: string | null | undefined,
  type: string | null | undefined,
): boolean {
  const document = documentByCode(type);
  if (!document) return false;
  const code = country?.trim().toUpperCase();
  return (
    code !== undefined && (document.countries as readonly string[]).includes(code)
  );
}

// ---------------------------------------------------------------------------
// Opciones para los `ij-select`
// ---------------------------------------------------------------------------

/**
 * El nombre del país y la etiqueta del documento **sí se traducen** (D-9: son
 * 4 + 9 cadenas de interfaz pura, y en inglés «México» debe decir «Mexico»); la
 * subdivisión **no**. La función de etiqueta la pasa el componente —
 * `(code) => i18n.enumLabel('country', code)` — para que el catálogo no dependa
 * de la inyección y un `computed` que la use se recalcule al cambiar de idioma.
 */
export function countryOptions(
  label: (code: string) => string = (code) => code,
): IjOption[] {
  return SUPPORTED_COUNTRIES.map((country) => ({
    value: country.code,
    label: label(country.code) || country.name,
  }));
}

export function documentOptions(
  country: string | null | undefined,
  label: (code: string) => string = (code) => code,
): IjOption[] {
  return documentsOf(country).map((document) => ({
    value: document.code,
    label: label(document.code) || document.label,
  }));
}

/** Subdivisiones como opciones. Sin traducir: van en su idioma oficial. */
export function subdivisionOptions(
  country: string | null | undefined,
): IjOption[] {
  return subdivisionsOf(country).map((item) => ({
    value: item.code,
    label: item.name,
  }));
}
