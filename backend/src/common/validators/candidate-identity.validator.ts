import { HttpStatus } from '@nestjs/common';
import {
  type CountryCode,
  countryByCode,
  isSupportedCountry,
} from '@/common/catalogs/countries';
import { isValidSubdivision } from '@/common/catalogs/country-subdivisions';
import { isDocumentAllowedIn } from '@/common/catalogs/identity-documents';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  isValidDocumentNumber,
  normalizeDocumentNumber,
} from '@/common/utils/identity-document.util';
import { normalizePhone } from '@/common/utils/phone.util';

/**
 * Reglas **cruzadas entre campos** de la identidad del aspirante (T36 § 5.3).
 * No caben en un `@IsIn` por campo: qué subdivisiones y qué documentos son
 * válidos depende del país que venga en *otro* campo del mismo cuerpo.
 *
 * Viven aquí, y no en un validador de `class-validator`, por el contrato de
 * error: lo que devuelve la tubería de validación es siempre
 * `errorCode: VALIDATION_ERROR`, y el frontend necesita conmutar sobre
 * `INVALID_SUBDIVISION` e `INVALID_DOCUMENT_NUMBER` para saltar al paso del
 * asistente donde está el campo. Lanzando `AppException` desde el caso de uso
 * cada fallo llega con su código. Los DTO siguen validando la **forma** de cada
 * campo por separado (largo, lista cerrada de países y de tipos).
 *
 * ⚠️ **El backend no puede fiarse de que el frontend filtró la lista.** Un
 * `POST` a mano con `country: 'CO'` y `documentType: 'MX_CURP'` se rechaza aquí.
 */

/** País del alcance (MX, CO, US, CA), normalizado a mayúsculas. */
export function requireSupportedCountry(
  country: string | null | undefined,
): CountryCode {
  const meta = countryByCode(country);
  if (!meta || !isSupportedCountry(meta.code)) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.UNSUPPORTED_COUNTRY,
      'El país no está disponible.',
    );
  }
  return meta.code;
}

/** Subdivisión que pertenece a ese país. Devuelve el código en mayúsculas. */
export function requireSubdivision(
  country: string | null | undefined,
  state: string | null | undefined,
): string {
  const value = state?.trim().toUpperCase() ?? '';
  if (!isValidSubdivision(country, value)) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_SUBDIVISION,
      'El estado o departamento no corresponde al país seleccionado.',
    );
  }
  return value;
}

export interface CheckedDocument {
  documentCountry: CountryCode;
  documentType: string;
  documentNumber: string;
}

/**
 * País emisor + tipo + número, con los tres mensajes distintos que pide § 5.3:
 * el tipo que no aplica al país y el número mal formado no son el mismo error
 * para quien rellena el formulario.
 */
export function requireIdentityDocument(
  documentCountry: string | null | undefined,
  documentType: string | null | undefined,
  documentNumber: string | null | undefined,
): CheckedDocument {
  const country = requireSupportedCountry(documentCountry);
  const type = documentType?.trim().toUpperCase() ?? '';

  if (!isDocumentAllowedIn(country, type)) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_DOCUMENT_NUMBER,
      'Ese tipo de documento no aplica al país seleccionado.',
    );
  }

  if (!isValidDocumentNumber(country, type, documentNumber)) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_DOCUMENT_NUMBER,
      'El número de documento no tiene el formato esperado.',
    );
  }

  return {
    documentCountry: country,
    documentType: type,
    documentNumber: normalizeDocumentNumber(type, documentNumber),
  };
}

/**
 * Teléfono a E.164 para ese país. `null`/vacío es válido (el teléfono del
 * aspirante es opcional, decisión pendiente N15) y devuelve `null`.
 */
export function normalizePhoneOrFail(
  country: string | null | undefined,
  phone: string | null | undefined,
): string | null {
  const value = phone?.trim();
  if (!value) return null;

  const meta = countryByCode(country);
  if (!meta) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.UNSUPPORTED_COUNTRY,
      'El país del teléfono no está disponible.',
    );
  }

  const normalized = normalizePhone(meta.code, value);
  if (!normalized) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_PHONE,
      `El teléfono debe tener ${meta.nationalDigits} dígitos para ${meta.name} (indicativo +${meta.dialCode} opcional).`,
    );
  }
  return normalized;
}

/**
 * Par teléfono + país tal y como se guarda: si no hay teléfono, **el país
 * también queda `null`** — un país de teléfono sin teléfono es ruido en la
 * tabla, y así lo dejó la migración para las filas antiguas.
 */
export function resolvePhonePair(
  phoneCountry: string | null | undefined,
  phone: string | null | undefined,
  fallbackCountry: string,
): { phone: string | null; phoneCountry: string | null } {
  const country = countryByCode(phoneCountry)?.code ?? fallbackCountry;
  const normalized = normalizePhoneOrFail(country, phone);
  return {
    phone: normalized,
    phoneCountry: normalized ? country : null,
  };
}

export interface CandidateIdentityInput {
  country?: string | null;
  state?: string | null;
  documentCountry?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  phoneCountry?: string | null;
}

/** Identidad del aspirante ya validada y normalizada, lista para persistir. */
export interface CheckedCandidateIdentity {
  country: CountryCode;
  state: string;
  documentCountry: CountryCode;
  documentType: string;
  documentNumber: string;
  phone: string | null;
  phoneCountry: string | null;
}

/**
 * Valida de una vez país, subdivisión, documento y teléfono, y devuelve los
 * valores normalizados. Lo usan el registro público y el alta desde el
 * back-office: **un solo sitio**, para que los dos caminos no puedan divergir.
 *
 * El país del documento y el del teléfono caen al de residencia cuando no
 * vienen, que es el caso normal.
 */
export function checkCandidateIdentity(
  input: CandidateIdentityInput,
): CheckedCandidateIdentity {
  const country = requireSupportedCountry(input.country);
  const state = requireSubdivision(country, input.state);
  const document = requireIdentityDocument(
    input.documentCountry ?? country,
    input.documentType,
    input.documentNumber,
  );
  const phone = resolvePhonePair(input.phoneCountry, input.phone, country);

  return {
    country,
    state,
    documentCountry: document.documentCountry,
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    phone: phone.phone,
    phoneCountry: phone.phoneCountry,
  };
}
