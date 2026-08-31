/** Configuración del candidato (M8 / HU-013). Espeja el contrato del backend. */
export type ProfileVisibility = 'PUBLIC' | 'PRIVATE';
export type InformationVisibility = 'FULL' | 'PARTIAL';

export interface CandidateSettings {
  profileVisibility: ProfileVisibility;
  informationVisibility: InformationVisibility;
  isImmediatelyAvailable: boolean;
}

export type CandidateSettingsPayload = CandidateSettings;

export const PROFILE_VISIBILITY_OPTIONS: readonly {
  value: ProfileVisibility;
  label: string;
  hint: string;
}[] = [
  {
    value: 'PUBLIC',
    label: 'Público',
    hint: 'Apareces en las búsquedas de empresas.',
  },
  {
    value: 'PRIVATE',
    label: 'Privado',
    hint: 'No apareces en las búsquedas de empresas.',
  },
];

export const INFORMATION_VISIBILITY_OPTIONS: readonly {
  value: InformationVisibility;
  label: string;
  hint: string;
}[] = [
  {
    value: 'FULL',
    label: 'Completa',
    hint: 'Se muestra toda tu información de perfil.',
  },
  {
    value: 'PARTIAL',
    label: 'Parcial',
    hint: 'Se muestra solo información básica de tu perfil.',
  },
];
