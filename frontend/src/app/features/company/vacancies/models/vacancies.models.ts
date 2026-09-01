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

/** Tipo de contrato LFT (espeja `ContractType` del backend, T15). */
export enum ContractType {
  INDEFINITE = 'INDEFINITE',
  FIXED_TERM = 'FIXED_TERM',
  SEASONAL = 'SEASONAL',
  OTHER = 'OTHER',
}

/** Escolaridad mínima (espeja `EducationLevel` del backend, T15). */
export enum EducationLevel {
  NONE = 'NONE',
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  TECHNICAL = 'TECHNICAL',
  BACHELOR = 'BACHELOR',
  SPECIALTY = 'SPECIALTY',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.INDEFINITE]: 'Tiempo indeterminado',
  [ContractType.FIXED_TERM]: 'Tiempo determinado',
  [ContractType.SEASONAL]: 'Por temporada',
  [ContractType.OTHER]: 'Por obra u otro',
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  [EducationLevel.NONE]: 'Sin estudios',
  [EducationLevel.PRIMARY]: 'Primaria',
  [EducationLevel.SECONDARY]: 'Secundaria',
  [EducationLevel.HIGH_SCHOOL]: 'Bachillerato / Preparatoria',
  [EducationLevel.TECHNICAL]: 'Carrera técnica / TSU',
  [EducationLevel.BACHELOR]: 'Licenciatura',
  [EducationLevel.SPECIALTY]: 'Especialidad',
  [EducationLevel.MASTER]: 'Maestría',
  [EducationLevel.DOCTORATE]: 'Doctorado',
};

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
  professionalAreaId: number | null;
  positionsCount: number;
  contractType: ContractType | null;
  minEducationLevel: EducationLevel | null;
  hasCommissions: boolean;
  /** YYYY-MM-DD, inclusive; null = sin fecha límite. */
  applicationDeadline: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryHidden: boolean;
  status: VacancyStatus;
  publishedAt: string | null;
  closedAt: string | null;
  /** Fin de la vigencia (T20); null = sin vencimiento. */
  expiresAt: string | null;
  refreshedAt: string | null;
  createdAt: string;
  isVerified: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  /** Capacidad de confidencialidad otorgada por el plan. */
  canBeConfidential: boolean;
  /** Capacidad de preguntas de filtrado otorgada por el plan (M15). */
  screeningEnabled: boolean;
  pauseCount: number;
  maxPauses: number;
  pausesLeft: number;
  canEditTitleOnReactivate: boolean;
  /** Vistas consolidadas (T18); se actualizan una vez al día. */
  viewsCount: number;
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
  professionalAreaId: number;
  positionsCount?: number;
  contractType: ContractType;
  minEducationLevel?: EducationLevel;
  hasCommissions?: boolean;
  /** YYYY-MM-DD, inclusive. */
  applicationDeadline?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden?: boolean;
  /** Sólo se honra si el plan otorgó `canBeConfidential`. */
  isConfidential?: boolean;
}

// ---- Preguntas de filtrado (M15) ----

export type VacancyQuestionType = 'OPEN' | 'CLOSED';

export interface VacancyQuestionOption {
  id: string;
  optionText: string;
  /** -1 = excluyente; 0..10 suma al puntaje. */
  weight: number;
  isExcluding: boolean;
  sortOrder: number;
}

export interface VacancyQuestion {
  id: string;
  questionText: string;
  questionType: VacancyQuestionType;
  sortOrder: number;
  options: VacancyQuestionOption[];
}

export interface SaveVacancyQuestionPayload {
  questionText: string;
  questionType: VacancyQuestionType;
  options?: { optionText: string; weight: number }[];
}
