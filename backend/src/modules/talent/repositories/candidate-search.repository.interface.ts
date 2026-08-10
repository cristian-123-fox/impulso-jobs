import { EntityManager } from 'typeorm';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';

export const CANDIDATE_SEARCH_REPOSITORY = 'CANDIDATE_SEARCH_REPOSITORY';

/**
 * Filtros del banco de talento (HU-016). Todos son opcionales y se combinan
 * con AND; los que apuntan a subrecursos (formación, idiomas, habilidades,
 * experiencia) se resuelven con `EXISTS`.
 */
export interface CandidateSearchCriteria {
  /** Empresa que busca: define qué perfiles privados puede ver. */
  companyId: string;
  /** Coincidencia parcial sobre nombre, apellido o título profesional. */
  search?: string;
  /** Código ISO 3166-2:MX. */
  state?: string;
  municipality?: string;
  educationLevel?: string;
  languageCode?: string;
  skill?: string;
  /**
   * Años mínimos desde el primer empleo registrado. Se traduce a una fecha
   * límite en el use-case para no depender de funciones de fecha del motor.
   */
  experienceSince?: Date;
  immediatelyAvailable?: boolean;
  page: number;
  limit: number;
}

export interface ICandidateSearchRepository {
  /**
   * Página de candidatos visibles para la empresa: perfiles públicos más los
   * que hayan postulado a una de sus vacantes.
   */
  search(
    criteria: CandidateSearchCriteria,
    manager?: EntityManager,
  ): Promise<[CandidateProfile[], number]>;
  /**
   * Perfil visible para esa empresa, o `null` si es privado y no ha postulado.
   * Aplica exactamente las mismas reglas de visibilidad que `search`.
   */
  findVisibleById(
    candidateProfileId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfile | null>;
  /** `true` si el candidato postuló a alguna vacante de la empresa. */
  hasAppliedToCompany(
    candidateProfileId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  /**
   * De una lista de candidatos, cuáles postularon a la empresa. Versión por
   * lote de `hasAppliedToCompany`, para no hacer N+1 en el listado.
   */
  filterAppliedToCompany(
    candidateProfileIds: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<string[]>;
}
