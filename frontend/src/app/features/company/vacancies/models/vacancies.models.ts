/** Estado de la vacante (espeja `VacancyStatus` del backend). */
export enum VacancyStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
}

export enum WorkMode {
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
}

export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  [VacancyStatus.ACTIVE]: 'Activa',
  [VacancyStatus.PAUSED]: 'Pausada',
  [VacancyStatus.CLOSED]: 'Cerrada',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Tiempo completo',
  [EmploymentType.PART_TIME]: 'Medio tiempo',
  [EmploymentType.CONTRACT]: 'Por contrato',
  [EmploymentType.TEMPORARY]: 'Temporal',
  [EmploymentType.INTERNSHIP]: 'Prácticas',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.ONSITE]: 'Presencial',
  [WorkMode.HYBRID]: 'Híbrido',
  [WorkMode.REMOTE]: 'Remoto',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  [ExperienceLevel.ENTRY]: 'Sin experiencia',
  [ExperienceLevel.JUNIOR]: 'Junior',
  [ExperienceLevel.MID]: 'Intermedio',
  [ExperienceLevel.SENIOR]: 'Senior',
  [ExperienceLevel.LEAD]: 'Líder / Manager',
};

/** Vacante vista por su empresa. */
export interface Vacancy {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  state: string;
  municipality: string;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryHidden: boolean;
  status: VacancyStatus;
  publishedAt: string | null;
  closedAt: string | null;
  refreshedAt: string | null;
  createdAt: string;
  isVerified: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  pauseCount: number;
  maxPauses: number;
  pausesLeft: number;
  canEditTitleOnReactivate: boolean;
}

export interface VacancyStats {
  total: number;
  active: number;
  paused: number;
  closed: number;
}

export interface VacanciesPage {
  items: Vacancy[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stats: VacancyStats;
}

export interface VacanciesFilters {
  search?: string;
  status?: VacancyStatus;
  page: number;
  limit: number;
}

/** Alta y edición. Los distintivos los otorga el plan, no el formulario. */
export interface SaveVacancyPayload {
  title: string;
  description: string;
  requirements?: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  state: string;
  municipality: string;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden?: boolean;
}
