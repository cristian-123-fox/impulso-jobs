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
/** Skill de la vacante tal como la ve la empresa (T25 backend, T32 frontend). */
export interface VacancySkill {
  id: string;
  skillId: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
}

/** Skill tal como viaja al guardar: sin `id` si es nueva. */
export interface SaveVacancySkill {
  skillId?: string;
  name: string;
  isRequired?: boolean;
  sortOrder?: number;
}

/** Sugerencia del autocomplete (`GET company/vacancies/skills/search`). */
export interface SkillSuggestion {
  id: string;
  name: string;
}

/** Tope por vacante, igual que `MAX_SKILLS_PER_VACANCY` del backend. */
export const MAX_VACANCY_SKILLS = 15;

export interface Vacancy {
  id: string;
  companyId: string;
  title: string;
  /** HTML saneado desde T32; las vacantes antiguas siguen en texto plano. */
  description: string;
  requirements: string | null;
  /** Responsabilidades del puesto (T32). */
  responsibilities: string | null;
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
  /** Imagen de referencia de la vacante (T24). */
  imageUrl: string | null;
  /** Skills de la vacante (T25 en backend; el formulario las edita desde T32). */
  skills: VacancySkill[];
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
  /** HTML del editor; el backend lo sanea al recibirlo. */
  description: string;
  requirements?: string;
  responsibilities?: string;
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
  /**
   * Skills de la vacante. Al **crear** sólo se guardan si vienen con elementos;
   * al **editar**, mandar `[]` las borra todas — así lo trata el backend.
   */
  skills?: SaveVacancySkill[];
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
