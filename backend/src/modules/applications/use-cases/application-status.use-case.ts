import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanyApplicationResponseDto } from '@/modules/applications/dto/application-response.dto';
import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';
import {
  type IApplicationStatusHistoryRepository,
  APPLICATION_STATUS_HISTORY_REPOSITORY,
} from '@/modules/applications/repositories/application-status-history.repository.interface';
import {
  type IApplicationStatusRepository,
  APPLICATION_STATUS_REPOSITORY,
} from '@/modules/applications/repositories/application-status.repository.interface';
import {
  type ICandidateApplicationRepository,
  CANDIDATE_APPLICATION_REPOSITORY,
} from '@/modules/applications/repositories/candidate-application.repository.interface';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import {
  CompanyApplicationActor,
  CompanyApplicationsUseCase,
} from '@/modules/applications/use-cases/company-applications.use-case';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

/**
 * Cambio de estado de una postulación (HU-015).
 *
 * El estado nuevo y su línea de historial se escriben en la misma transacción:
 * no puede quedar un estado sin rastro de quién lo cambió. Cambiar al estado
 * que ya tiene es un no-op idempotente — no ensucia el historial —, igual que
 * pausar una vacante ya pausada en M10.
 */
@Injectable()
export class ApplicationStatusUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
    @Inject(APPLICATION_STATUS_REPOSITORY)
    private readonly statuses: IApplicationStatusRepository,
    @Inject(APPLICATION_STATUS_HISTORY_REPOSITORY)
    private readonly historyEntries: IApplicationStatusHistoryRepository,
    private readonly companyOwnership: VacancyOwnershipService,
    private readonly ownership: ApplicationOwnershipService,
    private readonly companyApplications: CompanyApplicationsUseCase,
    private readonly audit: AuditService,
  ) {}

  async changeStatus(
    id: string,
    statusCode: string,
    actor: CompanyApplicationActor,
  ): Promise<CompanyApplicationResponseDto> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    const application = await this.ownership.requireCompanyApplication(
      id,
      company.id,
    );

    const target = await this.statuses.findByCode(statusCode);
    if (!target) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.APPLICATION_STATUS_NOT_FOUND,
        'El estado indicado no existe en el catálogo.',
      );
    }

    if (application.statusCode === target.code) {
      return this.companyApplications.get(id, actor);
    }

    const previousStatusCode = application.statusCode;
    const now = new Date();

    await runInTransaction(this.dataSource, async (manager) => {
      application.statusCode = target.code;
      await this.applications.save(application, manager);

      const entry = new ApplicationStatusHistory();
      entry.applicationId = application.id;
      entry.previousStatusCode = previousStatusCode;
      entry.currentStatusCode = target.code;
      entry.changedBy = actor.userId;
      entry.changedAt = now;
      await this.historyEntries.save(entry, manager);
    });

    await this.audit.record({
      action: 'applications.status.update',
      actorUserId: actor.userId,
      entity: 'candidate_application',
      entityId: application.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        previousStatusCode,
        statusCode: target.code,
        vacancyId: application.vacancyId,
        companyId: application.companyId,
      },
    });

    return this.companyApplications.get(id, actor);
  }
}
