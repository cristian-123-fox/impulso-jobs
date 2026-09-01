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

/** Pregunta de filtrado en el flujo de postulación (sin pesos: son secretos). */
export interface PublicVacancyQuestion {
  id: string;
  questionText: string;
  questionType: 'OPEN' | 'CLOSED';
  options: { id: string; optionText: string }[];
}

export interface ApplicationAnswerPayload {
  questionId: string;
  optionId?: string;
  answerText?: string;
}

/** Catálogo cerrado de motivos de denuncia (espeja el backend). */
export const VACANCY_REPORT_REASONS: readonly {
  code: string;
  label: string;
}[] = [
  { code: 'OFFENSIVE_DISCRIMINATORY', label: 'Es ofensiva y/o discriminatoria' },
  { code: 'ADVERTISEMENT', label: 'Es un anuncio, no una oferta de empleo' },
  { code: 'ASKS_FOR_MONEY', label: 'Me solicitan dinero' },
  { code: 'NO_RESPONSE', label: 'No responden a los postulados' },
  { code: 'LOW_PAY', label: 'Pagan muy poco o en malas condiciones' },
  { code: 'DUPLICATE', label: 'Oferta duplicada' },
  { code: 'OTHER', label: 'Otro motivo' },
];
