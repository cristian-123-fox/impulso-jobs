import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { AuditLog } from '@/modules/audit/entities/audit-log.entity';
import { IAuditLogRepository } from '@/modules/audit/repositories/audit-log.repository.interface';

@Injectable()
export class AuditLogRepository
  extends BaseRepository<AuditLog>
  implements IAuditLogRepository
{
  constructor(@InjectRepository(AuditLog) repo: Repository<AuditLog>) {
    super(repo);
  }

  async create(
    entry: Partial<AuditLog>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.repo(manager);
    await repo.save(repo.create(entry));
  }
}
