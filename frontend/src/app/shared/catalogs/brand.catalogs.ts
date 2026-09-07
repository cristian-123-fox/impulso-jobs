/**
 * Datos de contacto de la marca. Un único origen para el footer, la página de
 * contacto y el mapa, para que no vuelvan a divergir entre sí.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TODO(negocio): esto son DATOS DE MUESTRA, no la sede real.
 * Antes de publicar hay que reemplazar dirección, teléfonos, correos y
 * coordenadas por los de la empresa. Están aquí, juntos y en un solo archivo,
 * precisamente para que sea un cambio de un minuto.
 *
 * Sustituyen al contenido anterior, que situaba la empresa en Bogotá con
 * teléfonos +57 pese a que todo el producto es de México: catálogos de estados
 * y municipios MX, régimen fiscal del SAT, uso de CFDI y precios en MXN.
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
  street: 'Av. Paseo de la Reforma 296, piso 4',
  locality: 'Col. Juárez, Cuauhtémoc, 06600',
  city: 'Ciudad de México',
  lat: 19.4284,
  lng: -99.1653,
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
