/** Idiomas del portal (T26/N6: español para México, inglés para empresas). */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Idioma por defecto y de respaldo: una clave sin traducir cae aquí. */
export const DEFAULT_LANGUAGE: Language = 'es';

/**
 * La elección se guarda en **cookie**, no en `localStorage`.
 *
 * No es una preferencia estética: el portal se renderiza en servidor y el
 * criterio de aceptación pide que el HTML salga ya en el idioma correcto, sin
 * parpadeo al hidratar. `localStorage` no viaja en la petición, así que el
 * servidor no podría saber el idioma y siempre pintaría español; la cookie sí
 * llega, y el cliente lee la misma fuente, de modo que el primer render del
 * navegador coincide con el servido.
 */
export const LANGUAGE_COOKIE = 'ij_lang';

/** Un año: la elección de idioma no debería caducar en una sesión. */
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Parámetro que da **URL propia a cada idioma**: `/inicio?lang=en`.
 *
 * Existe por el SEO. Con el idioma sólo en una cookie, la misma URL devuelve
 * dos contenidos distintos y no hay forma honesta de emitir `hreflang`: los
 * buscadores necesitan una dirección por variante. Al entrar por ella el
 * idioma se guarda en la cookie y el parámetro deja de hacer falta.
 */
export const LANGUAGE_QUERY_PARAM = 'lang';

export function isSupportedLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/** Nombre de cada idioma **en ese idioma**, como se espera en un selector. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  es: 'Español',
  en: 'English',
};

/** Locale de Angular para fechas y moneda (T26 §6). */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  es: 'es-MX',
  en: 'en-US',
};

/**
 * Etiqueta `hreflang` de cada idioma. Más específica que el código a secas:
 * el español del portal es el de México y el inglés, el de EE. UU.
 */
export const LANGUAGE_HREFLANG: Record<Language, string> = {
  es: 'es-MX',
  en: 'en-US',
};
