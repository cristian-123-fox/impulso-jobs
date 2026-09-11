import { storageKeyFromUrl } from '@/common/storage/image-upload';

/**
 * Base pública del backend (`APP_PUBLIC_URL`). Con ella se componen las URLs de
 * los archivos subidos y —hoy— se **persisten en base de datos**
 * (`companies.logo_url`, `candidate_profiles.profile_photo_url` y
 * `vacancies.image_url`). Si aparece una cuarta columna así, añádela también a
 * `rehost-uploaded-files.ts`, que es la herramienta que repara lo ya guardado.
 *
 * Por eso no puede caer en silencio a `localhost` en un servidor real: la fila
 * queda con una URL que sólo resuelve dentro del propio servidor, el navegador
 * no puede cargar la imagen y **parece** que la subida no se guardó (T23).
 * En producción, si falta la variable, se arranca en fallo.
 */

const DEFAULT_PORT = 3000;

export const APP_PUBLIC_URL_MISSING_MESSAGE = [
  'Falta APP_PUBLIC_URL.',
  'Es la base de las URLs de las imágenes subidas (logo de empresa, foto del',
  'candidato, imagen de vacante) y se guarda tal cual en la base de datos:',
  'sin ella se',
  'persistirían URLs http://localhost:PORT que ningún navegador puede abrir.',
  'Define APP_PUBLIC_URL=https://<subdominio-del-api> en el .env y reinicia.',
].join(' ');

/** Sólo se avisa una vez por proceso: el adaptador se instancia por módulo. */
let warnedAboutFallback = false;

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV?.trim().toLowerCase() === 'production';
}

/** Quita las barras finales y exige una URL absoluta http(s) con host. */
export function normalizePublicBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `APP_PUBLIC_URL inválida ("${raw}"): debe ser una URL absoluta, p. ej. https://api.tudominio.com`,
    );
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !parsed.hostname
  ) {
    throw new Error(
      `APP_PUBLIC_URL inválida ("${raw}"): debe empezar por http:// o https:// e incluir el host.`,
    );
  }
  return value;
}

/**
 * Base pública ya normalizada. En desarrollo, sin variable, cae a localhost y
 * lo avisa; en producción lanza (el bootstrap la llama antes de levantar).
 */
export function resolveAppPublicUrl(): string {
  const raw = process.env.APP_PUBLIC_URL?.trim();
  if (raw) {
    return normalizePublicBaseUrl(raw);
  }
  if (isProductionEnv()) {
    throw new Error(APP_PUBLIC_URL_MISSING_MESSAGE);
  }
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      `[uploads] APP_PUBLIC_URL no definida: las imágenes subidas se guardarán con host localhost. ${APP_PUBLIC_URL_MISSING_MESSAGE}`,
    );
  }
  return `http://localhost:${process.env.PORT ?? DEFAULT_PORT}`;
}

/**
 * Reescribe el host de una URL de archivo **nuestro** (`/uploads/<clave>`) para
 * que apunte a `baseUrl`. Devuelve `null` si la URL no es de un archivo subido
 * por nosotros (externa, o con una clave que no sigue nuestro patrón) o si ya
 * apunta al host correcto. Es el motor del backfill `uploads:rehost`.
 */
export function rehostUploadedFileUrl(
  url: string | null | undefined,
  baseUrl: string,
): string | null {
  const key = storageKeyFromUrl(url);
  if (!key) return null;
  const rehosted = `${baseUrl}/uploads/${key}`;
  return rehosted === url ? null : rehosted;
}
