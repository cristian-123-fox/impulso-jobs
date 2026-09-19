import { EntityManager } from 'typeorm';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';

export const CANDIDATE_PROFILE_REPOSITORY = 'CANDIDATE_PROFILE_REPOSITORY';

export interface ICandidateProfileRepository {
  findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfile | null>;
  /** Perfiles de varios usuarios (listado admin: nombre de cada candidato). */
  findByUserIds(
    userIds: string[],
    manager?: EntityManager,
  ): Promise<CandidateProfile[]>;
  /** Perfiles por id (listado de postulaciones de una empresa). */
  findByIds(
    ids: string[],
    manager?: EntityManager,
  ): Promise<CandidateProfile[]>;
  /**
   * ¿Hay ya un perfil con ese documento? La unicidad es por
   * `(document_country, document_type, document_number)` desde T36: un
   * pasaporte `AB123456` mexicano y uno colombiano son personas distintas.
   */
  existsByDocument(
    documentCountry: string,
    documentType: string,
    documentNumber: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  save(
    profile: CandidateProfile,
    manager?: EntityManager,
  ): Promise<CandidateProfile>;
  /**
   * Baja lógica del perfil (M13, cancelación ARCO). Los subrecursos
   * (experiencia, educación, idiomas, habilidades) no se tocan: toda consulta
   * parte del perfil, así que dejan de ser alcanzables y la restauración es
   * inmediata.
   */
  softDeleteByUserId(userId: string, manager?: EntityManager): Promise<void>;
  /** Deshace la baja lógica del perfil. */
  restoreByUserId(userId: string, manager?: EntityManager): Promise<void>;
  /** Incluye perfiles dados de baja (restauración y purga). */
  findByUserIdIncludingDeleted(
    userId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfile | null>;
}
