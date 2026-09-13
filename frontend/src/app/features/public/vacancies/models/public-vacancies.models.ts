export {
  CONTRACT_TYPE_LABELS,
  ContractType,
  EDUCATION_LEVEL_LABELS,
  EducationLevel,
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/company/vacancies/models/vacancies.models';

/** Orden del listado público (espeja `PublicVacancySort` del backend). */
export type PublicVacancySort = 'relevance' | 'date' | 'salary';

/** Empresa mostrada en el portal; `null` si la vacante es confidencial. */
export interface PublicVacancyCompany {
  id: string;
  businessName: string;
  economicSector: string | null;
  logoUrl: string | null;
  website: string | null;
  state: string;
  municipality: string;
}

/** Vacante tal como la ve un candidato (o alguien sin cuenta). */
export interface PublicVacancy {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  /** Responsabilidades del puesto (T32). HTML del editor o texto plano antiguo. */
  responsibilities: string | null;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  experienceLevel: string;
  professionalAreaId: number | null;
  positionsCount: number;
  contractType: string | null;
  minEducationLevel: string | null;
  hasCommissions: boolean;
  /** YYYY-MM-DD, inclusive; null = sin fecha límite. */
  applicationDeadline: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  /** Fin de la vigencia (T20); null = sin vencimiento. */
  expiresAt: string | null;
  refreshedAt: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  /** Vistas consolidadas (T18); se actualizan una vez al día. */
  viewsCount: number;
  /** Imagen de referencia de la vacante (T24). */
  imageUrl: string | null;
  /** Skills requeridas/deseadas para la vacante (T25). */
  skills: { id: string; name: string; isRequired: boolean }[];
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
  /** Área profesional (catálogo compartido). */
  areaId?: number;
  /** Vacantes que pagan al menos esta cifra (MXN mensuales). */
  salaryMin?: number;
  /** Publicadas en los últimos N días (1 | 3 | 7 | 15 | 30). */
  publishedWithinDays?: number;
  sort?: PublicVacancySort;
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

/**
 * Catálogo cerrado de motivos de denuncia (espeja el backend). Sólo los
 * códigos: el texto de cada uno vive en el diccionario, bajo
 * `enums.reportReason.<código>` (T26).
 */
export const VACANCY_REPORT_REASON_CODES: readonly string[] = [
  'OFFENSIVE_DISCRIMINATORY',
  'ADVERTISEMENT',
  'ASKS_FOR_MONEY',
  'NO_RESPONSE',
  'LOW_PAY',
  'DUPLICATE',
  'OTHER',
];
