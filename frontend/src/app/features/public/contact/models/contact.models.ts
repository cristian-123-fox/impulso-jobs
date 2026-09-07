import { IconName } from '@/shared/ui';

export interface ContactHeroContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}

export interface ContactInfoCard {
  readonly icon: IconName;
  readonly title: string;
  readonly lines: readonly string[];
  /** `mailto:`/`tel:` por línea; vacío cuando el dato no es accionable. */
  readonly hrefs: readonly string[];
}

/** Ubicación de la oficina, con coordenadas para el mapa real. */
export interface ContactMapLocation {
  readonly officeName: string;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
}

export interface ContactFormValue {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly subject: string;
  readonly message: string;
}
