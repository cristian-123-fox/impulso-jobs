import { Company } from '@/modules/companies/entities/company.entity';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';

/** Vacante tal como la ve su empresa: incluye contadores y distintivos. */
export interface VacancyResponseDto {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string | null;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  experienceLevel: string;
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
  /** Pausas que aún puede consumir (nunca negativo). */
  pausesLeft: number;
  canEditTitleOnReactivate: boolean;
}

/**
 * Vacante en el portal. Cuando es confidencial se omite la identidad de la
 * empresa: el mapper nunca recibe el nombre real en ese caso, así que no hay
 * forma de filtrarlo por descuido en una capa superior.
 */
export interface PublicVacancyResponseDto {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  refreshedAt: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  company: PublicVacancyCompanyDto | null;
}

export interface PublicVacancyCompanyDto {
  id: string;
  businessName: string;
  economicSector: string | null;
  logoUrl: string | null;
  state: string;
  municipality: string;
}

/** Los `decimal` de TypeORM llegan como texto: se normalizan a número. */
function toAmount(value?: string | null): number | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function toVacancyResponse(vacancy: Vacancy): VacancyResponseDto {
  return {
    id: vacancy.id,
    companyId: vacancy.companyId,
    title: vacancy.title,
    description: vacancy.description,
    requirements: vacancy.requirements ?? null,
    employmentType: vacancy.employmentType,
    workMode: vacancy.workMode,
    state: vacancy.state,
    municipality: vacancy.municipality,
    experienceLevel: vacancy.experienceLevel,
    salaryMin: toAmount(vacancy.salaryMin),
    salaryMax: toAmount(vacancy.salaryMax),
    salaryHidden: vacancy.salaryHidden,
    status: vacancy.status,
    publishedAt: vacancy.publishedAt?.toISOString() ?? null,
    closedAt: vacancy.closedAt?.toISOString() ?? null,
    refreshedAt: vacancy.refreshedAt?.toISOString() ?? null,
    createdAt: vacancy.createdAt.toISOString(),
    isVerified: vacancy.isVerified,
    isFeatured: vacancy.isFeatured,
    isUrgent: vacancy.isUrgent,
    isConfidential: vacancy.isConfidential,
    pauseCount: vacancy.pauseCount,
    maxPauses: vacancy.maxPauses,
    pausesLeft: Math.max(0, vacancy.maxPauses - vacancy.pauseCount),
    canEditTitleOnReactivate: vacancy.canEditTitleOnReactivate,
  };
}

export function toPublicVacancyResponse(
  vacancy: Vacancy,
  company: Company | null,
): PublicVacancyResponseDto {
  const hideSalary = vacancy.salaryHidden;
  return {
    id: vacancy.id,
    title: vacancy.title,
    description: vacancy.description,
    requirements: vacancy.requirements ?? null,
    employmentType: vacancy.employmentType,
    workMode: vacancy.workMode,
    state: vacancy.state,
    municipality: vacancy.municipality,
    experienceLevel: vacancy.experienceLevel,
    salaryMin: hideSalary ? null : toAmount(vacancy.salaryMin),
    salaryMax: hideSalary ? null : toAmount(vacancy.salaryMax),
    publishedAt: vacancy.publishedAt?.toISOString() ?? null,
    refreshedAt: vacancy.refreshedAt?.toISOString() ?? null,
    isVerified: vacancy.isVerified,
    isFeatured: vacancy.isFeatured,
    isUrgent: vacancy.isUrgent,
    isConfidential: vacancy.isConfidential,
    company:
      vacancy.isConfidential || !company
        ? null
        : {
            id: company.id,
            businessName: company.businessName,
            economicSector: company.economicSector ?? null,
            logoUrl: company.logoUrl ?? null,
            state: company.state,
            municipality: company.municipality,
          },
  };
}
