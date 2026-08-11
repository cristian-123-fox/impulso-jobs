/**
 * Export de datos personales — derecho de **Acceso** (ARCO / LFPDPPP).
 *
 * Incluye todo lo que la plataforma guarda *sobre la persona*. Quedan fuera a
 * propósito:
 * - los binarios de las hojas de vida (se descargan por su propio endpoint);
 * - `audit_logs`, que es registro de seguridad de la plataforma, no un dato
 *   del titular;
 * - los datos de la empresa que no son personales (facturación, vacantes).
 */
export interface AccountExportDto {
  /** Fecha en que se generó el export, ISO-8601 UTC. */
  generatedAt: string;
  account: AccountExportAccountDto;
  candidate: AccountExportCandidateDto | null;
  company: AccountExportCompanyDto | null;
  applications: AccountExportApplicationDto[];
}

export interface AccountExportAccountDto {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface AccountExportCandidateDto {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  curp: string | null;
  birthDate: string;
  professionalTitle: string | null;
  summary: string | null;
  country: string;
  state: string;
  municipality: string;
  address: string | null;
  profilePhotoUrl: string | null;
  settings: {
    profileVisibility: string;
    informationVisibility: string;
    isImmediatelyAvailable: boolean;
  } | null;
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  languages: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  /** Metadatos de las hojas de vida; el PDF no viaja en el export. */
  resumes: Record<string, unknown>[];
}

export interface AccountExportCompanyDto {
  companyId: string;
  businessName: string;
  rfc: string;
  /** Rol de la persona dentro del equipo. */
  memberRole: string;
  memberSince: string;
}

export interface AccountExportApplicationDto {
  id: string;
  vacancyId: string;
  vacancyTitle: string | null;
  companyName: string | null;
  statusCode: string;
  appliedAt: string;
  history: {
    previousStatusCode: string | null;
    currentStatusCode: string;
    changedAt: string;
  }[];
}
