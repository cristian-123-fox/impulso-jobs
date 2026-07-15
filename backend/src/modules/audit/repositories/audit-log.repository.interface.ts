import { EntityManager } from 'typeorm';
import { AuditLog } from '@/modules/audit/entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface IAuditLogRepository {
  create(entry: Partial<AuditLog>, manager?: EntityManager): Promise<void>;
}
