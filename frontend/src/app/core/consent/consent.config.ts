/**
 * Categorías de cookies y tecnología de terceros, en un solo sitio.
 *
 * Es la lista que la Política de cookies describe y la que el banner ofrece. Lo
 * que **no** esté aquí no se carga: `ThirdPartyGateService` no lo activará y
 * `ConsentService` no lo informará. Así el aviso no puede quedarse corto
 * respecto de lo que la web hace de verdad, que es la forma habitual de que
 * estas políticas mientan sin querer.
 */

export interface CookieEntry {
  /** Nombre estable; el backend lo recibe en `metadata`. */
  readonly id: string;
  /** Nombre real de la cookie o del recurso. */
  readonly name: string;
  readonly category: CookieCategory;
  readonly provider: string;
  readonly purpose: string;
  /** `true` = se guarda y se envía sola. `false` = sólo mientras hay sesión. */
  readonly persistent: boolean;
}

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export const COOKIE_CATEGORIES: readonly CookieCategory[] = [
  'necessary',
  'functional',
  'analytics',
  'marketing',
];

/**
 * `necessary` no se puede rechazar.
 *
 * México no tiene una ley tipo GDPR que obligue a un opt-in para lo
 * estrictamente necesario, y esta web **no usa cookies de sesión**: el access y
 * el refresh token viven en `localStorage` y el estado de autenticación es un
 * signal en memoria. Lo que hay aquí abajo es, por tanto, todo recabado por
 * medios remotos o locales en el sentido del artículo 14, párrafo tercero del
 * Reglamento de la LFPDPPP — y por eso todo lo demás sí se puede rechazar.
 */
export const COOKIES: readonly CookieEntry[] = [
  {
    id: 'ij_lang',
    name: 'ij_lang',
    category: 'necessary',
    provider: 'Impulso Jobs (primera parte)',
    purpose:
      'Guarda el idioma elegido para no pedirlo en cada visita. No identifica ' +
      'a nadie.',
    persistent: true,
  },
  {
    id: 'ij_consent',
    name: 'ij_consent',
    category: 'necessary',
    provider: 'Impulso Jobs (primera parte)',
    purpose:
      'Guarda la respuesta al banner de cookies para no volver a mostrarlo. ' +
      'Sin ella no se puede saber qué ajeno se pidió.',
    persistent: true,
  },
  {
    id: 'gis',
    name: 'accounts.google.com (Google Identity Services)',
    category: 'functional',
    provider: 'Google LLC',
    purpose:
      'Botón de acceso con Google. Al pulsarlo, Google establece sus propias ' +
      'cookies en ese dominio y puede compartir la dirección IP con nosotros. ' +
      'No se carga si no hay una respuesta afirmativa.',
    persistent: true,
  },
  {
    id: 'osm_tiles',
    name: 'tile.openstreetmap.org',
    category: 'functional',
    provider: 'Fundación OpenStreetMap y colaboradores',
    purpose:
      'Muestra el mapa de la página de contacto y la ubicación de la vacante. ' +
      'Cada tesela descargada comunica la dirección IP a OpenStreetMap.',
    persistent: false,
  },
  {
    id: 'stripe',
    name: 'js.stripe.com / m.stripe.network',
    category: 'necessary',
    provider: 'Stripe Inc.',
    purpose:
      'Procesa el pago de planes y promociones. Es estrictamente necesario ' +
      'para completar una compra y no se usa para seguirte fuera del pago.',
    persistent: true,
  },
];

/** Idioma de la cookie `ij_lang`, que existe antes de este consentimiento. */
export const CONSENT_COOKIE = 'ij_consent';
export const CONSENT_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export type CookiePreferences = Record<CookieCategory, boolean>;

/** Lo que se concede cuando alguien no ha dicho nada todavía. */
export const DEFAULT_PREFERENCES: CookiePreferences = {
  // Lo mínimo indispensable para que la web funcione: idioma y sesión.
  necessary: true,
  // Todo lo demás apagado. El registro es siempre el estado más protector: la
  // antonimia de la carga previa en el artículo 15 fracción IV de la LFPDPPP
  // («opciones y medios para limitar el uso o divulgación»).
  functional: false,
  analytics: false,
  marketing: false,
};

export function isCookieCategory(value: unknown): value is CookieCategory {
  return (
    typeof value === 'string' &&
    (COOKIE_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Normaliza unas preferencias dadas. Todo lo desconocido se ignora y todo lo
 * ausente cae a `DEFAULT_PREFERENCES`: una cookie manipulada a mano no puede
 * encender una categoría que el usuario no hubiera autorizado.
 *
 * `necessary` se fuerza a `true` aunque venga en `false`. Es la única categoría
 * que no es una elección.
 */
export function normalizePreferences(
  value: unknown,
): CookiePreferences {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const source = value as Record<string, unknown>;
  const result: CookiePreferences = { ...DEFAULT_PREFERENCES };

  for (const category of COOKIE_CATEGORIES) {
    if (category === 'necessary') continue;
    if (typeof source[category] === 'boolean') {
      result[category] = source[category];
    }
  }

  return result;
}