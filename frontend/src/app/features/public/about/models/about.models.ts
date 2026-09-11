import { IconName, Tone } from '@/shared/ui';

/**
 * Contenido de "Nosotros" (T26). Como en la home, el texto viaja por **clave**
 * y lo resuelve la plantilla; aquí sólo quedan el icono, el tono, el orden y
 * los datos que se cuentan de los catálogos.
 */

/** Bloque "para quién es": una columna por tipo de usuario. */
export interface AboutAudience {
  readonly icon: IconName;
  readonly tone: Tone;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly featureKeys: readonly string[];
  readonly ctaLabelKey: string;
  readonly ctaPath: string;
}

export interface AboutStep {
  readonly num: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly icon: IconName;
  readonly tone: Tone;
}

/** Dato de cobertura. Sólo cifras comprobables contra los catálogos. */
export interface AboutFact {
  readonly value: string;
  readonly labelKey: string;
  readonly detailKey: string;
}
