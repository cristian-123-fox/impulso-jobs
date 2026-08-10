import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { ApplicationStatusCode } from '@/modules/applications/enums/application-status.enum';
import { IApplicationStatusHistoryRepository } from '@/modules/applications/repositories/application-status-history.repository.interface';
import { IApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository.interface';
import { ICandidateApplicationRepository } from '@/modules/applications/repositories/candidate-application.repository.interface';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import { ApplicationStatusUseCase } from '@/modules/applications/use-cases/application-status.use-case';
import { CompanyApplicationsUseCase } from '@/modules/applications/use-cases/company-applications.use-case';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function statusRow(code: string, isFinal = false): ApplicationStatus {
  return Object.assign(new ApplicationStatus(), {
    code,
    name: code,
    sortOrder: 1,
    isFinal,
  });
}

function application(): CandidateApplication {
  return Object.assign(new CandidateApplication(), {
    id: 'app-1',
    candidateProfileId: 'profile-1',
    vacancyId: 'vac-1',
    companyId: 'company-1',
    resumeId: 'resume-1',
    statusCode: ApplicationStatusCode.IN_REVIEW,
    appliedAt: new Date(),
  });
}

const actor = { userId: 'recruiter-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('ApplicationStatusUseCase', () => {
  let dataSource: DataSource;
  let applications: jest.Mocked<ICandidateApplicationRepository>;
  let statuses: jest.Mocked<IApplicationStatusRepository>;
  let history: jest.Mocked<IApplicationStatusHistoryRepository>;
  let companyOwnership: jest.Mocked<VacancyOwnershipService>;
  let ownership: jest.Mocked<ApplicationOwnershipService>;
  let companyApplications: jest.Mocked<CompanyApplicationsUseCase>;
  let audit: jest.Mocked<AuditService>;
  let useCase: ApplicationStatusUseCase;
  let current: CandidateApplication;

  beforeEach(() => {
    current = application();

    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    applications = {
      save: jest.fn((a: CandidateApplication) => Promise.resolve(a)),
    } as unknown as jest.Mocked<ICandidateApplicationRepository>;

    statuses = {
      findByCode: jest
        .fn()
        .mockImplementation((code: string) => Promise.resolve(statusRow(code))),
    } as unknown as jest.Mocked<IApplicationStatusRepository>;

    history = {
      save: jest.fn((e: unknown) => Promise.resolve(e)),
    } as unknown as jest.Mocked<IApplicationStatusHistoryRepository>;

    companyOwnership = {
      requireCompany: jest.fn().mockResolvedValue({ id: 'company-1' }),
    } as unknown as jest.Mocked<VacancyOwnershipService>;

    ownership = {
      requireCompanyApplication: jest.fn(() => Promise.resolve(current)),
    } as unknown as jest.Mocked<ApplicationOwnershipService>;

    companyApplications = {
      get: jest.fn().mockResolvedValue({ id: 'app-1' }),
    } as unknown as jest.Mocked<CompanyApplicationsUseCase>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new ApplicationStatusUseCase(
      dataSource,
      applications,
      statuses,
      history,
      companyOwnership,
      ownership,
      companyApplications,
      audit,
    );
  });

  it('cambia el estado y deja la línea de historial con previo y actual', async () => {
    await useCase.changeStatus('app-1', ApplicationStatusCode.INTERVIEW, actor);

    expect(current.statusCode).toBe(ApplicationStatusCode.INTERVIEW);
    expect(applications.save).toHaveBeenCalledTimes(1);

    expect(history.save).toHaveBeenCalledTimes(1);
    const entry = history.save.mock.calls[0][0];
    expect(entry.applicationId).toBe('app-1');
    expect(entry.previousStatusCode).toBe(ApplicationStatusCode.IN_REVIEW);
    expect(entry.currentStatusCode).toBe(ApplicationStatusCode.INTERVIEW);
    expect(entry.changedBy).toBe('recruiter-1');
  });

  it('escribe el estado y el historial dentro de la misma transacción', async () => {
    await useCase.changeStatus('app-1', ApplicationStatusCode.INTERVIEW, actor);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    // Ambas escrituras reciben el manager transaccional, no `undefined`.
    expect(applications.save.mock.calls[0][1]).toBeDefined();
    expect(history.save.mock.calls[0][1]).toBeDefined();
  });

  it('audita el cambio con el estado previo y el nuevo', async () => {
    await useCase.changeStatus('app-1', ApplicationStatusCode.REJECTED, actor);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'applications.status.update',
        entityId: 'app-1',
        metadata: expect.objectContaining({
          previousStatusCode: ApplicationStatusCode.IN_REVIEW,
          statusCode: ApplicationStatusCode.REJECTED,
        }),
      }),
    );
  });

  it('es idempotente: repetir el estado actual no ensucia el historial', async () => {
    await useCase.changeStatus('app-1', ApplicationStatusCode.IN_REVIEW, actor);

    expect(applications.save).not.toHaveBeenCalled();
    expect(history.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rechaza un estado que no está en el catálogo', async () => {
    statuses.findByCode.mockResolvedValue(null);

    try {
      await useCase.changeStatus('app-1', 'INVENTADO', actor);
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_STATUS_NOT_FOUND);
    }
    expect(applications.save).not.toHaveBeenCalled();
    expect(history.save).not.toHaveBeenCalled();
  });

  it('no deja tocar la postulación de otra empresa', async () => {
    ownership.requireCompanyApplication.mockRejectedValue(
      new AppException(
        404,
        ErrorCode.APPLICATION_NOT_FOUND,
        'La postulación no existe.',
      ),
    );

    try {
      await useCase.changeStatus(
        'de-otra',
        ApplicationStatusCode.SELECTED,
        actor,
      );
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_NOT_FOUND);
    }
    expect(applications.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
