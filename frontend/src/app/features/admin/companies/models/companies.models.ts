/** Empresa en el back-office (`GET /admin/companies`). */
export interface AdminCompany {
  id: string;
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  economicSector: string | null;
  companyType: string | null;
  corporateEmail: string | null;
  phoneNumber: string | null;
  website: string | null;
  country: string;
  state: string;
  municipality: string;
  logoUrl: string | null;
  createdAt: string;
  ownerEmail: string | null;
  memberCount: number;
}

export interface CompaniesPage {
  items: AdminCompany[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CompaniesFilters {
  search?: string;
  state?: string;
  page: number;
  limit: number;
}

export interface CreateCompanyPayload {
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  state: string;
  municipality: string;
  economicSector?: string;
  companyType?: string;
  corporateEmail?: string;
  phoneNumber?: string;
  website?: string;
  /** Si se envía, crea la cuenta OWNER verificada junto con la empresa. */
  owner?: { email: string; password: string };
}

export interface CreateCompanyResult {
  company: AdminCompany;
  ownerUserId: string | null;
}

/** Rol de un usuario dentro de la empresa (`company_users`). */
export enum CompanyMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  MEMBER = 'MEMBER',
}

export const COMPANY_MEMBER_ROLE_LABELS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'Propietario',
  [CompanyMemberRole.ADMIN]: 'Administrador',
  [CompanyMemberRole.RECRUITER]: 'Reclutador',
  [CompanyMemberRole.MEMBER]: 'Miembro',
};

/** Qué hace cada rol interno, para explicarlo en la interfaz. */
export const COMPANY_MEMBER_ROLE_HINTS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]:
    'Dueño de la cuenta: gestiona la empresa, su equipo y la facturación.',
  [CompanyMemberRole.ADMIN]:
    'Administra la empresa y su equipo, sin ser el titular.',
  [CompanyMemberRole.RECRUITER]:
    'Publica vacantes y gestiona candidatos y postulaciones.',
  [CompanyMemberRole.MEMBER]:
    'Acceso básico de consulta a la información de la empresa.',
};

export interface CompanyMember {
  userId: string;
  email: string;
  companyRole: CompanyMemberRole;
  /** Estado de la cuenta de plataforma (ACTIVE/INACTIVE/SUSPENDED). */
  status: string;
  emailVerified: boolean;
  lastLogin: string | null;
  joinedAt: string;
}

/** Alta de miembro: o se vincula una cuenta (`userId`) o se crea una nueva. */
export interface AddCompanyMemberPayload {
  role: CompanyMemberRole;
  userId?: string;
  email?: string;
  password?: string;
}
