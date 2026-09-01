/** Estado de la vacante. Sólo `ACTIVE` es visible en el portal público. */
export enum VacancyStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

/** Tipo de contratación (México). */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
}

/** Modalidad de trabajo. */
export enum WorkMode {
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
}

/** Nivel de experiencia requerido. */
export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
}

/** Tipo de contrato según la LFT mexicana (T15). */
export enum ContractType {
  INDEFINITE = 'INDEFINITE',
  FIXED_TERM = 'FIXED_TERM',
  SEASONAL = 'SEASONAL',
  OTHER = 'OTHER',
}

/** Escolaridad mínima requerida (9 niveles del sistema educativo MX, T15). */
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

/**
 * Orden del listado público (T15). `RELEVANCE` conserva la prioridad
 * monetizada (destacadas → urgentes → refresco); los otros dos ordenan de
 * forma literal, sin privilegiar promociones.
 */
export enum PublicVacancySort {
  RELEVANCE = 'relevance',
  DATE = 'date',
  SALARY = 'salary',
}

export const VACANCY_STATUSES: readonly string[] = Object.values(VacancyStatus);
export const EMPLOYMENT_TYPES: readonly string[] =
  Object.values(EmploymentType);
export const WORK_MODES: readonly string[] = Object.values(WorkMode);
export const EXPERIENCE_LEVELS: readonly string[] =
  Object.values(ExperienceLevel);
export const CONTRACT_TYPES: readonly string[] = Object.values(ContractType);
export const EDUCATION_LEVELS: readonly string[] =
  Object.values(EducationLevel);
export const PUBLIC_VACANCY_SORTS: readonly string[] =
  Object.values(PublicVacancySort);

/**
 * Pausas permitidas cuando no hay plan contratado. M14 (planes) sobrescribirá
 * `max_pauses` en la vacante al activar una promoción.
 */
export const DEFAULT_MAX_PAUSES = 2;

/**
 * Vigencia de la publicación (T20): días que una vacante permanece activa
 * desde que se publica. La vigencia se comunica en la ficha desde el día 1
 * (el análisis desaconseja los relojes opacos, §13.4.5).
 */
export const DEFAULT_VACANCY_LIFETIME_DAYS = 60;

/**
 * Vigencia efectiva, configurable con `VACANCY_LIFETIME_DAYS`. `0` desactiva
 * el reloj (las vacantes nuevas nacen sin vencimiento).
 */
export function vacancyLifetimeDays(): number {
  const raw = process.env.VACANCY_LIFETIME_DAYS;
  if (raw === undefined || raw === '') return DEFAULT_VACANCY_LIFETIME_DAYS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : DEFAULT_VACANCY_LIFETIME_DAYS;
}
