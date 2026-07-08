import { IconName, Tone } from '@/shared/ui';

/** Paso del proceso "Cómo funciona". */
export interface WorkStep {
  readonly num: string;
  readonly title: string;
  readonly description: string;
  readonly tone: Tone;
}

/** Categoría de empleos. */
export interface JobCategory {
  readonly icon: IconName;
  readonly jobsLabel: string;
  readonly name: string;
  readonly tone: Tone;
}

/** Empresa destacada. */
export interface Company {
  readonly name: string;
  readonly icon: IconName;
}

/** Vacante publicada (tarjeta de listado). */
export interface JobListing {
  readonly title: string;
  readonly posted: string;
  readonly logoText: string;
  readonly logoTone: Tone;
  readonly badge: string;
  readonly badgeTone: Tone;
  readonly salary: string;
  readonly location: string;
  readonly url: string;
}

/** Testimonio de cliente. */
export interface Testimonial {
  readonly name: string;
  readonly role: string;
  readonly quote: string;
}

/** Artículo del blog. */
export interface Article {
  readonly author: string;
  readonly title: string;
  readonly date: string;
  readonly excerpt: string;
}

/** Dato/indicador (tarjetas flotantes del hero y franja de estadísticas). */
export interface Stat {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly tone?: Tone;
}

/** Criterio de búsqueda emitido por el buscador del hero. */
export interface JobSearchCriteria {
  readonly query: string;
  readonly category: string;
  readonly location: string;
}
