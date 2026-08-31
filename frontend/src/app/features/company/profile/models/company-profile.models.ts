/** Perfil de empresa (M9 / HU-014). Espeja el contrato del backend. */
export interface CompanyProfile {
  id: string;
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  cfdiUse: string | null;
  postalCode: string;
  economicSector: string | null;
  companyType: string | null;
  corporateEmail: string | null;
  phoneNumber: string | null;
  website: string | null;
  country: string;
  state: string;
  municipality: string;
  address: string | null;
  companyDescription: string | null;
  employeeCount: number | null;
  foundationYear: number | null;
  logoUrl: string | null;
  companyRole: string | null;
}

export interface CompanyProfilePayload {
  businessName: string;
  legalName: string;
  taxRegime: string;
  cfdiUse?: string | null;
  postalCode: string;
  economicSector?: string | null;
  companyType?: string | null;
  corporateEmail?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  country?: string | null;
  state: string;
  municipality: string;
  address?: string | null;
  companyDescription?: string | null;
  employeeCount?: number | null;
  foundationYear?: number | null;
}

export interface CompanyLogoPayload {
  logoUrl?: string | null;
}

/** Tipo/figura legal de la empresa (espeja el enum del backend). */
export const COMPANY_TYPE_OPTIONS: readonly { value: string; label: string }[] =
  [
    { value: 'SA_DE_CV', label: 'S.A. de C.V.' },
    { value: 'S_DE_RL_DE_CV', label: 'S. de R.L. de C.V.' },
    { value: 'SAPI_DE_CV', label: 'S.A.P.I. de C.V.' },
    { value: 'SAS', label: 'S.A.S.' },
    { value: 'SC', label: 'Sociedad Civil (S.C.)' },
    { value: 'AC', label: 'Asociación Civil (A.C.)' },
    { value: 'PERSONA_FISICA', label: 'Persona Física con Actividad Empresarial' },
    { value: 'OTRO', label: 'Otro' },
  ];
