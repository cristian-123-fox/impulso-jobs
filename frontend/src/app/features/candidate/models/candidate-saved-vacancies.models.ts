import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';

/** Vacante guardada (T17). `vacancy` reutiliza la vista pública. */
export interface SavedVacancyItem {
  id: string;
  savedAt: string;
  /** `null` sólo si la vacante fue purgada físicamente. */
  vacancy: PublicVacancy | null;
  /** La vacante sigue activa: aún se puede postular. */
  isActive: boolean;
}

export interface SavedVacanciesPage {
  items: SavedVacancyItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
