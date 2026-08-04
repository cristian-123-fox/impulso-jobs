export {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  EmploymentType,
  ExperienceLevel,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/company/vacancies/models/vacancies.models';

/** Empresa mostrada en el portal; `null` si la vacante es confidencial. */
export interface PublicVacancyCompany {
  id: string;
  businessName: string;
  economicSector: string | null;
  logoUrl: string | null;
  state: string;
  municipality: string;
}

/** Vacante tal como la ve un candidato (o alguien sin cuenta). */
export interface PublicVacancy {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  refreshedAt: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  company: PublicVacancyCompany | null;
}

export interface PublicVacanciesPage {
  items: PublicVacancy[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PublicVacanciesFilters {
  search?: string;
  state?: string;
  municipality?: string;
  employmentType?: string;
  workMode?: string;
  experienceLevel?: string;
  page: number;
  limit: number;
}
