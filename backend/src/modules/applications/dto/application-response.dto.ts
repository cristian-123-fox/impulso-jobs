import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/iam/users/entities/user.entity';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';

/** Estado del catálogo tal como lo consume la UI. */
export interface ApplicationStatusResponseDto {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isFinal: boolean;
}

/** Resumen de la vacante dentro de una postulación del candidato. */
export interface ApplicationVacancyDto {
  id: string;
  title: string;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  status: string;
  /** Nulo si la vacante es confidencial. */
  companyName: string | null;
  companyLogoUrl: string | null;
}

/** Resumen del aspirante dentro de una postulación vista por la empresa. */
export interface ApplicationCandidateDto {
  id: string;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  state: string;
  municipality: string;
  profilePhotoUrl: string | null;
  /**
   * Contacto del postulado. Todos los planes de pago incluyen el contacto de
   * quien ya postuló, así que no se condiciona aquí; lo que sí depende del
   * plan es la base de talento (M12/M14), que es otro flujo.
   */
  email: string | null;
}

export interface ApplicationResumeDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** Postulación como la ve el aspirante: qué vacante y en qué punto va. */
export interface CandidateApplicationResponseDto {
  id: string;
  status: ApplicationStatusResponseDto | null;
  appliedAt: string;
  updatedAt: string;
  resumeId: string | null;
  vacancy: ApplicationVacancyDto | null;
}

/** Postulación como la ve la empresa: quién postuló y a qué vacante. */
export interface CompanyApplicationResponseDto {
  id: string;
  status: ApplicationStatusResponseDto | null;
  appliedAt: string;
  updatedAt: string;
  candidate: ApplicationCandidateDto | null;
  vacancy: ApplicationVacancyDto | null;
  resume: ApplicationResumeDto | null;
}

export interface ApplicationStatusHistoryResponseDto {
  id: string;
  previousStatus: ApplicationStatusResponseDto | null;
  currentStatus: ApplicationStatusResponseDto | null;
  changedBy: string | null;
  changedAt: string;
}

export function toApplicationStatusResponse(
  status: ApplicationStatus,
): ApplicationStatusResponseDto {
  return {
    code: status.code,
    name: status.name,
    description: status.description ?? null,
    sortOrder: status.sortOrder,
    isFinal: status.isFinal,
  };
}

/**
 * Resumen de vacante. Ante el aspirante, una vacante confidencial oculta a la
 * empresa igual que en el portal público (M10). La propia empresa dueña sí se
 * ve a sí misma, así que pasa `revealCompany: true`.
 */
export function toApplicationVacancy(
  vacancy: Vacancy,
  company: Company | null,
  revealCompany = false,
): ApplicationVacancyDto {
  const hideCompany = (vacancy.isConfidential && !revealCompany) || !company;
  return {
    id: vacancy.id,
    title: vacancy.title,
    employmentType: vacancy.employmentType,
    workMode: vacancy.workMode,
    state: vacancy.state,
    municipality: vacancy.municipality,
    status: vacancy.status,
    companyName: hideCompany ? null : company.businessName,
    companyLogoUrl: hideCompany ? null : (company.logoUrl ?? null),
  };
}

export function toApplicationCandidate(
  profile: CandidateProfile,
  user: User | null,
): ApplicationCandidateDto {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    professionalTitle: profile.professionalTitle ?? null,
    state: profile.state,
    municipality: profile.municipality,
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    email: user?.email ?? null,
  };
}

export function toApplicationResume(
  resume: CandidateResume,
): ApplicationResumeDto {
  return {
    id: resume.id,
    fileName: resume.fileName,
    fileSize: resume.fileSize,
    mimeType: resume.mimeType,
  };
}

export function toCandidateApplicationResponse(
  application: CandidateApplication,
  status: ApplicationStatus | null,
  vacancy: ApplicationVacancyDto | null,
): CandidateApplicationResponseDto {
  return {
    id: application.id,
    status: status ? toApplicationStatusResponse(status) : null,
    appliedAt: application.appliedAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    resumeId: application.resumeId ?? null,
    vacancy,
  };
}

export function toCompanyApplicationResponse(
  application: CandidateApplication,
  status: ApplicationStatus | null,
  candidate: ApplicationCandidateDto | null,
  vacancy: ApplicationVacancyDto | null,
  resume: ApplicationResumeDto | null,
): CompanyApplicationResponseDto {
  return {
    id: application.id,
    status: status ? toApplicationStatusResponse(status) : null,
    appliedAt: application.appliedAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    candidate,
    vacancy,
    resume,
  };
}

export function toApplicationStatusHistoryResponse(
  entry: ApplicationStatusHistory,
  statuses: Map<string, ApplicationStatus>,
): ApplicationStatusHistoryResponseDto {
  const previous = entry.previousStatusCode
    ? statuses.get(entry.previousStatusCode)
    : undefined;
  const current = statuses.get(entry.currentStatusCode);
  return {
    id: entry.id,
    previousStatus: previous ? toApplicationStatusResponse(previous) : null,
    currentStatus: current ? toApplicationStatusResponse(current) : null,
    changedBy: entry.changedBy ?? null,
    changedAt: entry.changedAt.toISOString(),
  };
}
