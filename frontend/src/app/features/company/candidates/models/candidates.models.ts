/** De dónde viene el acceso al perfil. */
export enum CandidateAccessSource {
  /** Postuló a una vacante de la empresa: gratuito y permanente. */
  APPLICANT = 'APPLICANT',
  /** Perfil público del banco de talento: abrirlo consume una visita. */
  TALENT_POOL = 'TALENT_POOL',
}

/** Cupo de visitas al banco de talento. `-1` = ilimitado. */
export interface TalentQuota {
  totalVisits: number;
  usedVisits: number;
  remainingVisits: number;
  unlimited: boolean;
}

/** Ficha resumida de la búsqueda. Nunca trae datos de contacto. */
export interface CandidateSearchItem {
  id: string;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  state: string;
  municipality: string;
  profilePhotoUrl: string | null;
  isImmediatelyAvailable: boolean;
  accessSource: CandidateAccessSource;
  /** `false` si abrir el detalle va a descontar una visita. */
  alreadyUnlocked: boolean;
}

export interface CandidateExperience {
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string | null;
}

export interface CandidateEducation {
  institutionName: string;
  educationLevel: string;
  degreeName: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export interface CandidateLanguage {
  languageCode: string;
  level: string;
  isNative: boolean;
}

export interface CandidateSkill {
  name: string;
  level: string | null;
  yearsExperience: number | null;
}

export interface CandidateResumeSummary {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
}

export interface CandidateDetail {
  id: string;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  summary: string | null;
  state: string;
  municipality: string;
  profilePhotoUrl: string | null;
  isImmediatelyAvailable: boolean;
  accessSource: CandidateAccessSource;
  email: string | null;
  experiences: CandidateExperience[];
  educations: CandidateEducation[];
  languages: CandidateLanguage[];
  skills: CandidateSkill[];
  resumes: CandidateResumeSummary[];
  /** Cupo tras abrir esta ficha (puede haber descontado una visita). */
  quota: TalentQuota;
}

export interface CandidatesPage {
  items: CandidateSearchItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  quota: TalentQuota;
}

export interface CandidatesFilters {
  search?: string;
  state?: string;
  municipality?: string;
  skill?: string;
  immediatelyAvailable?: boolean;
  page: number;
  limit: number;
}
