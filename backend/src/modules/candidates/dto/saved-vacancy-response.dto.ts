import { Company } from '@/modules/companies/entities/company.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import {
  PublicVacancyResponseDto,
  toPublicVacancyResponse,
} from '@/modules/vacancies/dto/vacancy-response.dto';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';

/** Vacante guardada (T17). Reutiliza la vista pública de la vacante. */
export interface SavedVacancyResponseDto {
  id: string;
  savedAt: string;
  /** `null` sólo si la vacante fue purgada físicamente. */
  vacancy: PublicVacancyResponseDto | null;
  /** La vacante sigue activa: aún se puede postular. */
  isActive: boolean;
}

export function toSavedVacancyResponse(
  saved: SavedVacancy,
  vacancy: Vacancy | null,
  company: Company | null,
): SavedVacancyResponseDto {
  return {
    id: saved.id,
    savedAt: saved.createdAt.toISOString(),
    vacancy: vacancy ? toPublicVacancyResponse(vacancy, company) : null,
    isActive: vacancy?.status === VacancyStatus.ACTIVE,
  };
}
