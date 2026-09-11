import { IconName, Tone } from '@/shared/ui';

/** Estado de una sección que depende de la API. */
export type LoadState = 'loading' | 'loaded' | 'error';

/**
 * Paso del proceso "Cómo funciona".
 *
 * El texto viaja como **clave de traduccion** (T26): el contenido de marca se
 * declara en el facade, pero quien lo resuelve es la plantilla, que es donde
 * Transloco puede repintarlo al cambiar de idioma.
 */
export interface WorkStep {
  readonly num: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly icon: IconName;
  readonly tone: Tone;
}

/**
 * Área profesional destacada en la home. `areaId` es el id real del catálogo
 * (T15), así que la tarjeta puede enlazar a un filtro que la API entiende.
 */
export interface HomeArea {
  readonly areaId: number;
  readonly name: string;
  readonly icon: IconName;
  readonly tone: Tone;
}

/** Empresa que publica en el portal, tal como se muestra en el muro de logos. */
export interface HomeCompany {
  readonly name: string;
  readonly logoUrl: string | null;
}

/**
 * Testimonio de una persona que usó el portal. El nombre es un dato, no un
 * texto traducible; el puesto y la cita sí (T26).
 */
export interface Testimonial {
  readonly name: string;
  readonly roleKey: string;
  readonly quoteKey: string;
}

/** Tarjeta flotante del hero. El icono y el tono son obligatorios. */
export interface HeroStat {
  /** Ya formateado: puede ser una cifra o una palabra ("Gratis"). */
  readonly value: string;
  readonly labelKey: string;
  readonly icon: IconName;
  readonly tone: Tone;
}

/** Criterio de búsqueda emitido por el buscador del hero. */
export interface JobSearchCriteria {
  readonly query: string;
  /** Id del área profesional, como string (viene de un `<select>`). */
  readonly area: string;
  /** Código ISO del estado (`CMX`, `JAL`…). */
  readonly state: string;
}
