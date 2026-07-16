import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { Language } from '@/modules/candidates/entities/language.entity';

export const EDUCATION_LEVELS = [
  'SECONDARY',
  'HIGH_SCHOOL',
  'TECHNICAL',
  'TECHNOLOGIST',
  'BACHELOR',
  'SPECIALIZATION',
  'MASTER',
  'DOCTORATE',
] as const;

export const LANGUAGE_LEVELS = [
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'FLUENT',
  'NATIVE',
] as const;

export const SKILL_LEVELS = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
] as const;

export class UpdateCandidateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  professionalTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  municipality!: string;

  @IsString()
  @IsNotEmpty()
  birthDate!: string;
}

export class UpdateCandidatePhotoDto {
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'La URL de la foto no es válida.' })
  @MaxLength(500)
  profilePhotoUrl?: string | null;
}

export class UpsertCandidateExperienceDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  location!: string;

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  isCurrent!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  responsibilities?: string;
}

export class UpsertCandidateEducationDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  institutionName!: string;

  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel!: (typeof EDUCATION_LEVELS)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  degreeName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  fieldOfStudy?: string;

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  isCurrent!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class UpsertCandidateLanguageDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  languageCode!: string;

  @IsString()
  @IsIn(LANGUAGE_LEVELS)
  level!: (typeof LANGUAGE_LEVELS)[number];

  @IsBoolean()
  isNative!: boolean;
}

export class UpsertCandidateSkillDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @IsIn(SKILL_LEVELS)
  level?: (typeof SKILL_LEVELS)[number];

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(50)
  yearsExperience?: number;
}

export interface CandidateProfileResponseDto {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  professionalTitle: string | null;
  summary: string | null;
  address: string | null;
  profilePhotoUrl: string | null;
  country: string;
  state: string;
  municipality: string;
  completion: number;
}

export interface CandidateExperienceResponseDto {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string | null;
}

export interface CandidateEducationResponseDto {
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

export interface CandidateLanguageResponseDto {
  id: string;
  languageCode: string;
  languageName: string;
  level: string;
  isNative: boolean;
}

export interface CandidateSkillResponseDto {
  id: string;
  name: string;
  level: string | null;
  yearsExperience: number | null;
}

export interface LanguageCatalogResponseDto {
  code: string;
  name: string;
}

export function toCandidateProfileResponse(
  profile: CandidateProfile,
  email: string,
  completion: number,
): CandidateProfileResponseDto {
  return {
    id: profile.id,
    userId: profile.userId,
    email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    documentType: profile.documentType,
    documentNumber: profile.documentNumber,
    birthDate: profile.birthDate,
    professionalTitle: profile.professionalTitle ?? null,
    summary: profile.summary ?? null,
    address: profile.address ?? null,
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    country: profile.country,
    state: profile.state,
    municipality: profile.municipality,
    completion,
  };
}

export function toCandidateExperienceResponse(
  experience: CandidateExperience,
): CandidateExperienceResponseDto {
  return {
    id: experience.id,
    jobTitle: experience.jobTitle,
    companyName: experience.companyName,
    location: experience.location,
    startDate: experience.startDate,
    endDate: experience.endDate ?? null,
    isCurrent: experience.isCurrent,
    responsibilities: experience.responsibilities ?? null,
  };
}

export function toCandidateEducationResponse(
  education: CandidateEducation,
): CandidateEducationResponseDto {
  return {
    id: education.id,
    institutionName: education.institutionName,
    educationLevel: education.educationLevel,
    degreeName: education.degreeName,
    fieldOfStudy: education.fieldOfStudy ?? null,
    startDate: education.startDate,
    endDate: education.endDate ?? null,
    isCurrent: education.isCurrent,
    description: education.description ?? null,
  };
}

export function toCandidateLanguageResponse(
  language: CandidateLanguage,
  catalog: Language,
): CandidateLanguageResponseDto {
  return {
    id: language.id,
    languageCode: language.languageCode,
    languageName: catalog.name,
    level: language.level,
    isNative: language.isNative,
  };
}

export function toCandidateSkillResponse(
  skill: CandidateSkill,
): CandidateSkillResponseDto {
  return {
    id: skill.id,
    name: skill.name,
    level: skill.level ?? null,
    yearsExperience: skill.yearsExperience ?? null,
  };
}

export function toLanguageCatalogResponse(
  language: Language,
): LanguageCatalogResponseDto {
  return {
    code: language.code,
    name: language.name,
  };
}
