/** Tipo/figura legal de la empresa (México). Opcional en el perfil. */
export enum CompanyType {
  SA_DE_CV = 'SA_DE_CV',
  S_DE_RL_DE_CV = 'S_DE_RL_DE_CV',
  SAPI_DE_CV = 'SAPI_DE_CV',
  SAS = 'SAS',
  SC = 'SC',
  AC = 'AC',
  PERSONA_FISICA = 'PERSONA_FISICA',
  OTRO = 'OTRO',
}

export const COMPANY_TYPES: readonly string[] = Object.values(CompanyType);
