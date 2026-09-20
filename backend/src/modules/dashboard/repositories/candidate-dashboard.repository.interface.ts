import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import {
  CountByKey,
  DailyCount,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';

export const CANDIDATE_DASHBOARD_REPOSITORY = 'CANDIDATE_DASHBOARD_REPOSITORY';

/** Lo que el aspirante ha rellenado de su perfil, para medir la completitud. */
export interface ProfileSectionCounts {
  experiences: number;
  educations: number;
  languages: number;
  skills: number;
  resumes: number;
}

export interface ProfileViewsSummary {
  /** Empresas distintas que han consultado su CV (`talent_access_views`). */
  total: number;
  /** Consultas dentro del periodo. */
  recent: number;
  lastViewedAt: Date | null;
}

/**
 * Agregados del panel del aspirante, acotados **siempre** a su propio perfil.
 *
 * El perfil se resuelve aquí (`findProfileByUserId`) en vez de pedirle el
 * repositorio a `CandidatesModule`: el panel sólo necesita leerlo, y así este
 * módulo no depende de otro más.
 */
export interface ICandidateDashboardRepository {
  findProfileByUserId(userId: string): Promise<CandidateProfile | null>;
  countApplications(profileId: string): Promise<number>;
  countApplicationsByStatus(profileId: string): Promise<CountByKey[]>;
  applicationsPerDay(
    profileId: string,
    from: Date,
    to: Date,
  ): Promise<DailyCount[]>;
  countSavedVacancies(profileId: string): Promise<number>;
  profileSections(profileId: string): Promise<ProfileSectionCounts>;
  profileViews(profileId: string, since: Date): Promise<ProfileViewsSummary>;
}
