import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@/modules/audit/entities/audit-log.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { AUDIT_LOG_REPOSITORY } from '@/modules/audit/repositories/audit-log.repository.interface';
import { AuditLogRepository } from '@/modules/audit/repositories/audit-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogRepository },
    AuditService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
