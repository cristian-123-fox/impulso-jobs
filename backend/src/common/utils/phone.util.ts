import { countryByCode } from '@/common/catalogs/countries';

/**
 * Normalización de teléfonos a E.164 por país (T36). Sustituye a
 * `normalizeMxPhone`, que era mexicano por construcción.
 *
 * Reglas del frontend en paralelo: `frontend/src/app/shared/utils/phone.ts`.
 * **Los dos ficheros se editan a la vez**; el backend es la autoridad y el
 * frontend sólo adelanta el mensaje (decisión D-7).
 */

/** `+` más los 15 dígitos máximos de E.164. */
export const PHONE_MAX_LENGTH = 16;

/**
 * Pasa un teléfono a E.164 (`+523312345678`) para el país dado, o `null` si no
 * encaja. **No adivina el país**: el país lo elige el usuario y se guarda
 * aparte, porque `+1` es Estados Unidos **y** Canadá (decisión D-1).
 *
 * ```
 * 1. Deja sólo dígitos.                    "+52 (33) 1234-5678" -> "523312345678"
 * 2. Si empieza por "00", quítalo.         (prefijo de salida internacional)
 * 3. Si ya mide lo que mide un número nacional -> ése es.
 * 4. Si empieza por el indicativo Y lo que queda mide exacto -> quita el indicativo.
 * 5. Cualquier otra cosa -> null.
 * ```
 *
 * ⚠️ **El paso 4 comprueba la longitud resultante antes de recortar**, y eso es
 * justo lo que el `normalizeMxPhone` viejo no hacía: su `.replace(/^\+?52/, '')`
 * a ciegas mutilaba cualquier número nacional que empezara por `52`
 * (`5212345678` → `12345678`, inválido). Hay un test para ese caso.
 */
export function normalizePhone(
  country: string | null | undefined,
  raw: string | null | undefined,
): string | null {
  const meta = countryByCode(country);
  if (!meta || !raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;

  const { dialCode, nationalDigits } = meta;

  let national: string | null = null;
  if (digits.length === nationalDigits) {
    national = digits;
  } else if (
    digits.startsWith(dialCode) &&
    digits.length === dialCode.length + nationalDigits
  ) {
    national = digits.slice(dialCode.length);
  }

  return national ? `+${dialCode}${national}` : null;
}

/**
 * Pinta un E.164 con la agrupación del país (`+52 33 1234 5678`). Si el valor
 * no encaja con ese país —una fila vieja sin normalizar, un país cambiado a
 * mano— se devuelve **tal cual**: esto es presentación y nunca debe ocultar el
 * dato que hay guardado.
 */
export function formatPhone(
  country: string | null | undefined,
  e164: string | null | undefined,
): string {
  if (!e164) return '';
  const meta = countryByCode(country);
  if (!meta) return e164;

  const digits = e164.replace(/\D/g, '');
  const expected = meta.dialCode.length + meta.nationalDigits;
  if (digits.length !== expected || !digits.startsWith(meta.dialCode)) {
    return e164;
  }

  const national = digits.slice(meta.dialCode.length);
  const parts: string[] = [];
  let offset = 0;
  for (const size of meta.phoneGroups) {
    parts.push(national.slice(offset, offset + size));
    offset += size;
  }
  if (offset < national.length) parts.push(national.slice(offset));

  return `+${meta.dialCode} ${parts.join(' ')}`;
}

/**
 * Número nacional (sólo dígitos) de un E.164 ya guardado, para repintar un
 * formulario. Si el valor no encaja con el país, devuelve sus dígitos sin más:
 * el usuario ve lo que hay y puede corregirlo.
 */
export function nationalNumberOf(
  country: string | null | undefined,
  e164: string | null | undefined,
): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  const meta = countryByCode(country);
  if (!meta) return digits;
  if (
    digits.startsWith(meta.dialCode) &&
    digits.length === meta.dialCode.length + meta.nationalDigits
  ) {
    return digits.slice(meta.dialCode.length);
  }
  return digits;
}
