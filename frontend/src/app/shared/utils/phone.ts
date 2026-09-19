import {
  type CountryCode,
  DEFAULT_COUNTRY,
  countryByCode,
} from '@/shared/catalogs/countries.catalogs';

/**
 * Teléfonos por país (T36). Espejo de `backend/src/common/utils/phone.util.ts`:
 * **los dos ficheros se editan a la vez**. El backend es la autoridad; esto
 * existe para que el usuario vea el error sin esperar al servidor (D-7).
 */

/**
 * Valor de `ij-phone-input`. Es un **objeto y no la cadena E.164** a propósito:
 * con la cadena, `writeValue('+14155550123')` no podría saber si pintar
 * «Estados Unidos» o «Canadá», que comparten el `+1` (D-1 / D-5).
 */
export interface IjPhoneValue {
  /** ISO 3166-1 alpha-2 del país elegido. */
  country: CountryCode;
  /** Número nacional tal y como se teclea (sólo dígitos). */
  national: string;
  /** E.164 (`+523312345678`), o `null` si `national` aún no es válido. */
  e164: string | null;
}

/**
 * Pasa un teléfono a E.164 para el país dado, o `null` si no encaja.
 *
 * ⚠️ El paso que recorta el indicativo **comprueba antes la longitud
 * resultante**: recortarlo a ciegas mutilaba cualquier número nacional que
 * empezara por el indicativo (`5212345678` en México).
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
 * Pinta un E.164 con la agrupación del país (`+52 33 1234 5678`). Si el valor no
 * encaja con ese país —una fila anterior a la migración— se devuelve tal cual:
 * esto es presentación y no debe ocultar lo que hay guardado.
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

/** Número nacional (sólo dígitos) de un E.164, para repintar un formulario. */
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

/**
 * Del valor del control al cuerpo de la petición. Una línea por formulario, en
 * vez de repetir el mapeo en los ocho que tienen teléfono.
 */
export function toPhonePayload(value: IjPhoneValue | null | undefined): {
  phone: string | null;
  phoneCountry: string | null;
} {
  if (!value?.national) return { phone: null, phoneCountry: null };
  return {
    phone: value.e164 ?? value.national,
    phoneCountry: value.country,
  };
}

/**
 * De lo que devuelve la API al valor del control. El `fallback` es el país que
 * se pinta cuando la fila no trae `phoneCountry` — el caso de los datos
 * anteriores a T36 y de las cuentas sin teléfono.
 */
export function fromPhonePayload(
  phone: string | null | undefined,
  phoneCountry: string | null | undefined,
  fallback: CountryCode = DEFAULT_COUNTRY,
): IjPhoneValue {
  const country = countryByCode(phoneCountry)?.code ?? fallback;
  const national = nationalNumberOf(country, phone);
  return {
    country,
    national,
    e164: normalizePhone(country, national),
  };
}

/** Valor vacío del control, con el país que toque. */
export function emptyPhoneValue(
  country: CountryCode = DEFAULT_COUNTRY,
): IjPhoneValue {
  return { country, national: '', e164: null };
}
