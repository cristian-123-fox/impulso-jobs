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
