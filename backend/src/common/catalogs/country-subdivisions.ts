import { MX_STATES } from '@/common/catalogs/mx-states';
import { type CountryCode, COUNTRY_CODES } from '@/common/catalogs/countries';

/**
 * Subdivisión de primer nivel de cada país del alcance (T36): estados de
 * México, departamentos de Colombia, estados de Estados Unidos y provincias y
 * territorios de Canadá.
 *
 * **Se guarda el código sin prefijo de país** (`JAL`, no `MX-JAL`), que es el
 * formato que ya tienen las filas mexicanas — el país viaja aparte, en
 * `country` (decisión D-4).
 *
 * ⚠️ **Los códigos NO son únicos entre países.** Hay dos colisiones reales
 * entre estos cuatro:
 *
 * - `GUA` → Guanajuato (MX) **y** Guainía (CO)
 * - `DC`  → District of Columbia (US) **y** Bogotá D.C. (CO)
 *
 * Por eso toda función de aquí pide el país, y `subdivisionName` no tiene
 * versión de un solo argumento. `stateBySlug()` / `stateSlugOf()` de
 * `frontend/src/app/shared/utils/seo.ts` sólo miran `MX_STATES` y siguen siendo
 * correctas —las landings son de vacantes, que son mexicanas—, pero **no valen
 * para pintar la ubicación de un aspirante**.
 *
 * Los nombres se quedan en su idioma oficial y **no se traducen** (D-9), igual
 * que hoy los estados mexicanos.
 */
export interface Subdivision {
  code: string;
  name: string;
}

/** 32 departamentos + Bogotá D.C. (ISO 3166-2:CO). */
const CO_DEPARTMENTS: readonly Subdivision[] = [
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

/** 50 estados + District of Columbia (códigos postales de 2 letras). */
const US_STATES: readonly Subdivision[] = [
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

/** 10 provincias + 3 territorios (ISO 3166-2:CA). */
const CA_PROVINCES: readonly Subdivision[] = [
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

/**
 * México **no se copia aquí**: se importa de `mx-states.ts`, que sigue siendo
 * su único origen (lo usan además empresa y vacante, que siguen siendo MX).
 */
export const SUBDIVISIONS_BY_COUNTRY: Readonly<
  Record<CountryCode, readonly Subdivision[]>
> = {
  MX: MX_STATES,
  CO: CO_DEPARTMENTS,
  US: US_STATES,
  CA: CA_PROVINCES,
};

/** Subdivisiones del país, o lista vacía si el país no está en el alcance. */
export function subdivisionsOf(
  country: string | null | undefined,
): readonly Subdivision[] {
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
  return subdivisionsOf(country).some(
    (subdivision) => subdivision.code === value,
  );
}

/**
 * Nombre de la subdivisión. **Siempre con el país**: sin él, `GUA` y `DC` son
 * ambiguos (ver la nota de arriba). Devuelve `null` si la combinación no existe.
 */
export function subdivisionName(
  country: string | null | undefined,
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const value = code.trim().toUpperCase();
  return (
    subdivisionsOf(country).find((subdivision) => subdivision.code === value)
      ?.name ?? null
  );
}
