/**
 * Datos de contacto de la marca. Un único origen para el footer, la página de
 * contacto y el mapa, para que no vuelvan a divergir entre sí.
 *
 * Dirección, teléfonos y correos confirmados por el negocio para la entrega.
 * Deben coincidir con `LEGAL_IDENTITY` (aviso de privacidad y términos): si
 * cambia el domicilio fiscal, se actualizan los dos archivos en el mismo
 * commit. Las coordenadas son aproximadas a la altura de Av. Alemania 1294;
 * el mapa es orientativo, no una geolocalización catastral.
 * ────────────────────────────────────────────────────────────────────────────
 */
export interface BrandOffice {
  readonly street: string;
  readonly locality: string;
  readonly city: string;
  /** Para el mapa (Leaflet) y el enlace a "cómo llegar". */
  readonly lat: number;
  readonly lng: number;
}

export const BRAND_OFFICE: BrandOffice = {
  street: 'Av. Alemania 1294, Interior 1',
  locality: 'Col. Moderna, 44190',
  city: 'Guadalajara, Jalisco',
  lat: 20.6637456,
  lng: -103.3581704,
};

/** Dirección en una línea, para el footer y los metadatos. */
export const BRAND_ADDRESS_LINE = `${BRAND_OFFICE.street}, ${BRAND_OFFICE.locality}, ${BRAND_OFFICE.city}`;

export const BRAND_PHONES = {
  /** Fijo de CDMX (lada 55). */
  office: '+52 55 4160 3820',
  /** Móvil con WhatsApp. */
  mobile: '+52 55 7325 1094',
} as const;

export const BRAND_EMAILS = {
  general: 'hola@impulsojobs.mx',
  companies: 'empresas@impulsojobs.mx',
  support: 'soporte@impulsojobs.mx',
} as const;

/** `tel:` / `mailto:` necesitan el número sin espacios. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}
