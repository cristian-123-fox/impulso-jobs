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

export const VACANCY_STATUSES: readonly string[] = Object.values(VacancyStatus);
export const EMPLOYMENT_TYPES: readonly string[] =
  Object.values(EmploymentType);
export const WORK_MODES: readonly string[] = Object.values(WorkMode);
export const EXPERIENCE_LEVELS: readonly string[] =
  Object.values(ExperienceLevel);

/**
 * Pausas permitidas cuando no hay plan contratado. M14 (planes) sobrescribirá
 * `max_pauses` en la vacante al activar una promoción.
 */
export const DEFAULT_MAX_PAUSES = 2;
