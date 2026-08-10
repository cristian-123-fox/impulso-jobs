import { EntityManager } from 'typeorm';
import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';

export const APPLICATION_STATUS_HISTORY_REPOSITORY =
  'APPLICATION_STATUS_HISTORY_REPOSITORY';

export interface IApplicationStatusHistoryRepository {
  /** Historial de una postulación, del cambio más antiguo al más reciente. */
  findByApplicationId(
    applicationId: string,
    manager?: EntityManager,
  ): Promise<ApplicationStatusHistory[]>;
  save(
    entry: ApplicationStatusHistory,
    manager?: EntityManager,
  ): Promise<ApplicationStatusHistory>;
}
