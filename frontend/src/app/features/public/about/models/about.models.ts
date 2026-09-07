import { IconName, Tone } from '@/shared/ui';

export interface AboutHeroContent {
  readonly title: string;
  readonly lead: string;
  readonly breadcrumbLabel: string;
}

/** Bloque "para quién es": una columna por tipo de usuario. */
export interface AboutAudience {
  readonly icon: IconName;
  readonly tone: Tone;
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly ctaLabel: string;
  readonly ctaPath: string;
}

export interface AboutStep {
  readonly num: string;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly tone: Tone;
}

/** Dato de cobertura. Sólo cifras comprobables contra los catálogos. */
export interface AboutFact {
  readonly value: string;
  readonly label: string;
  readonly detail: string;
}

export interface AboutCtaContent {
  readonly title: string;
  readonly description: string;
}
