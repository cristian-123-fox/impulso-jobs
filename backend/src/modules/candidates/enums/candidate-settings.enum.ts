/** Visibilidad del perfil del candidato en las búsquedas (M8 / HU-013). */
export enum ProfileVisibility {
  /** Aparece en la búsqueda de empresas (M12). */
  PUBLIC = 'PUBLIC',
  /** No aparece en la búsqueda de empresas (M12). */
  PRIVATE = 'PRIVATE',
}

/** Alcance de la información visible del candidato. */
export enum InformationVisibility {
  /** Se muestra toda la información del perfil. */
  FULL = 'FULL',
  /** Se muestra información parcial del perfil. */
  PARTIAL = 'PARTIAL',
}

export const PROFILE_VISIBILITIES: readonly string[] =
  Object.values(ProfileVisibility);

export const INFORMATION_VISIBILITIES: readonly string[] = Object.values(
  InformationVisibility,
);
