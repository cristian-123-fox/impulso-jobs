import { EntityManager } from 'typeorm';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';

export const SAVED_VACANCY_REPOSITORY = 'SAVED_VACANCY_REPOSITORY';

export interface SavedVacancySearch {
  candidateProfileId: string;
  page: number;
  limit: number;
}

export interface ISavedVacancyRepository {
  findByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<SavedVacancy | null>;
  /** Página de guardadas del perfil, de la más reciente a la más antigua. */
  findAndCountByProfile(
    criteria: SavedVacancySearch,
    manager?: EntityManager,
  ): Promise<[SavedVacancy[], number]>;
  /** Ids de vacante guardados (para pintar el estado en el portal). */
  findVacancyIdsByProfile(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<string[]>;
  save(saved: SavedVacancy, manager?: EntityManager): Promise<SavedVacancy>;
  /** Borrado físico e idempotente (ver nota en la entidad). */
  deleteByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<void>;
}
