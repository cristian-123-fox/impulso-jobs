export interface CandidateProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** País emisor del documento (T36). El documento es de sólo lectura aquí. */
  documentCountry: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  professionalTitle: string | null;
  summary: string | null;
  address: string | null;
  profilePhotoUrl: string | null;
  /** ISO 3166-1 alpha-2 (`MX`, `CO`, `US`, `CA`). */
  country: string;
  state: string;
  municipality: string;
  /** E.164. Editable por el propio aspirante desde T36. */
  phone: string | null;
  phoneCountry: string | null;
  completion: number;
}

export interface CandidateExperience {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string | null;
}

export interface CandidateEducation {
  id: string;
  institutionName: string;
  educationLevel: string;
  degreeName: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface CandidateLanguage {
  id: string;
  languageCode: string;
  languageName: string;
  level: string;
  isNative: boolean;
}

export interface CandidateSkill {
  id: string;
  name: string;
  level: string | null;
  yearsExperience: number | null;
}

export interface LanguageCatalogItem {
  code: string;
  name: string;
}

export interface CandidateProfilePayload {
  firstName: string;
  lastName: string;
  professionalTitle?: string | null;
  summary?: string | null;
  address?: string | null;
  country: string;
  state: string;
  municipality: string;
  birthDate: string;
  phone?: string | null;
  phoneCountry?: string | null;
}

export interface CandidatePhotoPayload {
  profilePhotoUrl?: string | null;
}

export interface CandidateExperiencePayload {
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  responsibilities?: string | null;
}

export interface CandidateEducationPayload {
  institutionName: string;
  educationLevel: string;
  degreeName: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

export interface CandidateLanguagePayload {
  languageCode: string;
  level: string;
  isNative: boolean;
}

export interface CandidateSkillPayload {
  name: string;
  level?: string | null;
  yearsExperience?: number | null;
}

export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'SECONDARY', label: 'Secundaria' },
  { value: 'HIGH_SCHOOL', label: 'Bachillerato' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'TECHNOLOGIST', label: 'Tecnólogo' },
  { value: 'BACHELOR', label: 'Licenciatura' },
  { value: 'SPECIALIZATION', label: 'Especialización' },
  { value: 'MASTER', label: 'Maestría' },
  { value: 'DOCTORATE', label: 'Doctorado' },
] as const;

export const LANGUAGE_LEVEL_OPTIONS = [
  { value: 'BASIC', label: 'Básico' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
  { value: 'FLUENT', label: 'Fluido' },
  { value: 'NATIVE', label: 'Nativo' },
] as const;

export const SKILL_LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
  { value: 'EXPERT', label: 'Experto' },
] as const;
