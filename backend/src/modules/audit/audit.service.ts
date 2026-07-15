import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  AUDIT_LOG_REPOSITORY,
  type IAuditLogRepository,
} from '@/modules/audit/repositories/audit-log.repository.interface';

export interface AuditEntry {
  action: string;
  actorUserId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Persiste eventos de auditoría. La auditoría no debe tumbar la operación. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly repository: IAuditLogRepository,
  ) {}

  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    try {
      await this.repository.create(entry, manager);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría "${entry.action}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
