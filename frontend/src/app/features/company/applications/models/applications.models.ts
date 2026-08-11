/** Estado del catálogo (`application_statuses`, sembrado por `seed:applications`). */
export interface ApplicationStatus {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  /** Estado terminal: ya no admite más cambios. */
  isFinal: boolean;
}

export interface ApplicationVacancy {
  id: string;
  title: string;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  status: string;
  companyName: string | null;
  companyLogoUrl: string | null;
}

/**
 * Datos del aspirante. `email` y teléfono llegan **sólo** si el plan de la
 * empresa incluye `applicant_contact_data`; si no, vienen en `null`.
 */
export interface ApplicationCandidate {
  id: string;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  state: string;
  municipality: string;
  profilePhotoUrl: string | null;
  email: string | null;
}

export interface ApplicationResume {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CompanyApplication {
  id: string;
  status: ApplicationStatus | null;
  appliedAt: string;
  updatedAt: string;
  candidate: ApplicationCandidate | null;
  vacancy: ApplicationVacancy | null;
  resume: ApplicationResume | null;
}

export interface ApplicationStatusHistory {
  id: string;
  previousStatus: ApplicationStatus | null;
  currentStatus: ApplicationStatus | null;
  changedBy: string | null;
  changedAt: string;
}

/** Conteo por código de estado, para las pestañas del listado. */
export type ApplicationStats = Record<string, number>;

export interface ApplicationsPage {
  items: CompanyApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stats: ApplicationStats;
}

export interface ApplicationsFilters {
  vacancyId?: string;
  status?: string;
  page: number;
  limit: number;
}
