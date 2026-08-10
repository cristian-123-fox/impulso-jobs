import { EntityManager } from 'typeorm';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';

export const TALENT_ACCESS_REPOSITORY = 'TALENT_ACCESS_REPOSITORY';

export interface ITalentAccessRepository {
  /**
   * Cupos vigentes de la empresa (no vencidos), del más antiguo al más
   * reciente para consumirlos en orden de caducidad.
   */
  findActiveGrants(
    companyId: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<TalentAccessGrant[]>;
  saveGrant(
    grant: TalentAccessGrant,
    manager?: EntityManager,
  ): Promise<TalentAccessGrant>;
  /** Consulta previa de ese CV por esa empresa, si la hubo. */
  findView(
    companyId: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<TalentAccessView | null>;
  /** De una lista de candidatos, cuáles ya desbloqueó la empresa (por lote). */
  findViewedCandidateIds(
    companyId: string,
    candidateProfileIds: string[],
    manager?: EntityManager,
  ): Promise<string[]>;
  saveView(
    view: TalentAccessView,
    manager?: EntityManager,
  ): Promise<TalentAccessView>;
}
