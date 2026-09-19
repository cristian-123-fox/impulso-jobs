/**
 * Países en los que **un aspirante** puede registrarse (T36).
 *
 * El negocio sigue siendo mexicano —moneda, IVA, facturación CFDI, empresas y
 * vacantes—; lo que esto abre es *quién puede postularse*. Ver
 * `Impulso_Jobs_Multipais_Candidatos.md` § 11 para lo que queda fuera.
 *
 * **Catálogo embebido, sin librería de teléfonos (decisión D-8).** Para cuatro
 * países con longitud nacional fija cabe en una pantalla y es auditable;
 * `libphonenumber-js` son ~145 KB comprimidos en un portal con SSR y
 * presupuestos ya ajustados por CKEditor. ⚠️ **Si el alcance pasa de ~10
 * países, esta decisión se revisa**: a esa escala las reglas por país dejan de
 * ser una tabla y la librería empieza a pagar su tamaño.
 *
 * Espejo en el frontend: `frontend/src/app/shared/catalogs/countries.catalogs.ts`
 * (mismo contenido, misma forma). Los dos se editan a la vez.
 */
export interface SupportedCountry {
  /** ISO 3166-1 alpha-2. Es el valor que se almacena. */
  code: string;
  /** Nombre en español. El nombre visible lo traduce el frontend (D-9). */
  name: string;
  /** Indicativo telefónico, sin `+`. ⚠️ `1` es US **y** CA (D-1). */
  dialCode: string;
  /** Dígitos del número nacional, sin indicativo. */
  nationalDigits: number;
  /**
   * Agrupación para pintar el número (sólo presentación). La suma de los
   * grupos es `nationalDigits`.
   */
  phoneGroups: readonly number[];
}

export const SUPPORTED_COUNTRIES = [
  // MX primero: es el mercado principal y el país por defecto de los formularios.
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

/** País por defecto de todo formulario y respaldo de las filas antiguas. */
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
