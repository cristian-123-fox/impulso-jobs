import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { User } from '@/modules/iam/users/entities/user.entity';
import { CandidateAccessSource } from '@/modules/talent/enums/talent-access.enum';
import { TalentQuotaSummary } from '@/modules/talent/services/talent-quota.service';

/** Ficha resumida en los resultados de búsqueda. Nunca incluye contacto. */
export interface CandidateSearchItemDto {
  id: string;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  state: string;
  municipality: string;
  profilePhotoUrl: string | null;
  isImmediatelyAvailable: boolean;
  /** De dónde viene el acceso: si es TALENT_POOL, el detalle costará cupo. */
  accessSource: CandidateAccessSource;
  /** `false` si abrir el detalle va a descontar una visita. */
  alreadyUnlocked: boolean;
}

export interface CandidateExperienceDto {
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string | null;
}

export interface CandidateEducationDto {
  institutionName: string;
  educationLevel: string;
  degreeName: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export interface CandidateLanguageDto {
  languageCode: string;
  level: string;
  isNative: boolean;
}

export interface CandidateSkillDto {
  name: string;
  level: string | null;
  yearsExperience: number | null;
}

export interface CandidateResumeSummaryDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
}

/**
 * Detalle del candidato para la empresa.
 *
 * `informationVisibility = PARTIAL` recorta el contacto y el detalle fino:
 * la empresa ve el perfil profesional pero no puede contactar por fuera de la
 * plataforma. Los campos ocultos viajan como `null`, no se omiten, para que el
 * front no tenga que adivinar.
 */
export interface CandidateDetailDto {
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
  /** Nulo si la información es parcial. */
  email: string | null;
  experiences: CandidateExperienceDto[];
  educations: CandidateEducationDto[];
  languages: CandidateLanguageDto[];
  skills: CandidateSkillDto[];
  resumes: CandidateResumeSummaryDto[];
  /** Estado del cupo tras esta consulta. */
  quota: TalentQuotaSummary;
}

function isoDate(value?: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export function toCandidateSearchItem(
  profile: CandidateProfile,
  accessSource: CandidateAccessSource,
  isImmediatelyAvailable: boolean,
  alreadyUnlocked: boolean,
): CandidateSearchItemDto {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    professionalTitle: profile.professionalTitle ?? null,
    state: profile.state,
    municipality: profile.municipality,
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    isImmediatelyAvailable,
    accessSource,
    alreadyUnlocked,
  };
}

export interface CandidateDetailInput {
  profile: CandidateProfile;
  user: User | null;
  experiences: CandidateExperience[];
  educations: CandidateEducation[];
  languages: CandidateLanguage[];
  skills: CandidateSkill[];
  resumes: CandidateResume[];
  isImmediatelyAvailable: boolean;
  /** `false` recorta el contacto (configuración PARTIAL del candidato). */
  showContact: boolean;
  accessSource: CandidateAccessSource;
  quota: TalentQuotaSummary;
}

export function toCandidateDetail(
  input: CandidateDetailInput,
): CandidateDetailDto {
  const { profile } = input;
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    professionalTitle: profile.professionalTitle ?? null,
    summary: profile.summary ?? null,
    state: profile.state,
    municipality: profile.municipality,
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    isImmediatelyAvailable: input.isImmediatelyAvailable,
    accessSource: input.accessSource,
    email: input.showContact ? (input.user?.email ?? null) : null,
    experiences: input.experiences.map((item) => ({
      jobTitle: item.jobTitle,
      companyName: item.companyName,
      location: item.location,
      startDate: isoDate(item.startDate) ?? '',
      endDate: isoDate(item.endDate),
      isCurrent: item.isCurrent,
      responsibilities: item.responsibilities ?? null,
    })),
    educations: input.educations.map((item) => ({
      institutionName: item.institutionName,
      educationLevel: item.educationLevel,
      degreeName: item.degreeName,
      fieldOfStudy: item.fieldOfStudy ?? null,
      startDate: isoDate(item.startDate) ?? '',
      endDate: isoDate(item.endDate),
      isCurrent: item.isCurrent,
    })),
    languages: input.languages.map((item) => ({
      languageCode: item.languageCode,
      level: item.level,
      isNative: item.isNative,
    })),
    skills: input.skills.map((item) => ({
      name: item.name,
      level: item.level ?? null,
      yearsExperience: item.yearsExperience ?? null,
    })),
    resumes: input.resumes.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      isDefault: item.isDefault,
    })),
    quota: input.quota,
  };
}
