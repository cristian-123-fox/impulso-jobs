import { EntityManager } from 'typeorm';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';

export const CANDIDATE_PROFILE_SETTINGS_REPOSITORY =
  'CANDIDATE_PROFILE_SETTINGS_REPOSITORY';

export interface ICandidateProfileSettingsRepository {
  findByProfileId(
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfileSettings | null>;
  /** Configuración de varios perfiles (listado del banco de talento, M12). */
  findByProfileIds(
    candidateProfileIds: string[],
    manager?: EntityManager,
  ): Promise<CandidateProfileSettings[]>;
  save(
    settings: CandidateProfileSettings,
    manager?: EntityManager,
  ): Promise<CandidateProfileSettings>;
}
