import { EntityManager } from 'typeorm';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';

export const APPLICATION_STATUS_REPOSITORY = 'APPLICATION_STATUS_REPOSITORY';

export interface IApplicationStatusRepository {
  /** Catálogo completo, en orden de presentación. */
  findAll(manager?: EntityManager): Promise<ApplicationStatus[]>;
  findByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<ApplicationStatus | null>;
}
