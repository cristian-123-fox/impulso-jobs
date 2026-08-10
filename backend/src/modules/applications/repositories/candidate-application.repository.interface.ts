import { EntityManager } from 'typeorm';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';

export const CANDIDATE_APPLICATION_REPOSITORY =
  'CANDIDATE_APPLICATION_REPOSITORY';

/** Filtros del listado del candidato (sus propias postulaciones). */
export interface CandidateApplicationSearch {
  candidateProfileId: string;
  statusCode?: string;
  page: number;
  limit: number;
}

/** Filtros del listado de la empresa (postulaciones a sus vacantes). */
export interface CompanyApplicationSearch {
  companyId: string;
  /** Acota a una vacante concreta de la empresa. */
  vacancyId?: string;
  statusCode?: string;
  page: number;
  limit: number;
}

export interface ICandidateApplicationRepository {
  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null>;
  /** Detalle acotado por ownership del candidato. */
  findByIdAndProfile(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null>;
  /** Detalle acotado por ownership de la empresa. */
  findByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null>;
  findAndCountByProfile(
    criteria: CandidateApplicationSearch,
    manager?: EntityManager,
  ): Promise<[CandidateApplication[], number]>;
  findAndCountByCompany(
    criteria: CompanyApplicationSearch,
    manager?: EntityManager,
  ): Promise<[CandidateApplication[], number]>;
  /** Evita la doble postulación a la misma vacante. */
  existsByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  /** Postulaciones activas de una vacante, para los avisos de cierre (M16). */
  findByVacancy(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication[]>;
  countByCompanyGroupedByStatus(
    companyId: string,
    vacancyId?: string,
    manager?: EntityManager,
  ): Promise<Record<string, number>>;
  save(
    application: CandidateApplication,
    manager?: EntityManager,
  ): Promise<CandidateApplication>;
}
