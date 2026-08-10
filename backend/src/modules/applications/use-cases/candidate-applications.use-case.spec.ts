import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { ApplicationStatusCode } from '@/modules/applications/enums/application-status.enum';
import { IApplicationStatusHistoryRepository } from '@/modules/applications/repositories/application-status-history.repository.interface';
import { IApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository.interface';
import { ICandidateApplicationRepository } from '@/modules/applications/repositories/candidate-application.repository.interface';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import { CandidateApplicationsUseCase } from '@/modules/applications/use-cases/candidate-applications.use-case';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { ICandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function vacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return Object.assign(new Vacancy(), {
    id: 'vac-1',
    companyId: 'company-1',
    title: 'Desarrollador Frontend',
    description: 'Descripción',
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    state: 'JAL',
    municipality: 'Zapopan',
    experienceLevel: ExperienceLevel.SENIOR,
    status: VacancyStatus.ACTIVE,
    salaryHidden: false,
    isVerified: false,
    isFeatured: false,
    isUrgent: false,
    isConfidential: false,
    pauseCount: 0,
    maxPauses: 2,
    canEditTitleOnReactivate: false,
    createdAt: new Date(),
    ...overrides,
  });
}

function profile(): CandidateProfile {
  return Object.assign(new CandidateProfile(), {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'Ana',
    lastName: 'López',
    state: 'JAL',
    municipality: 'Zapopan',
  });
}

function statusRow(code: string): ApplicationStatus {
  return Object.assign(new ApplicationStatus(), {
    code,
    name: code,
    sortOrder: 1,
    isFinal: false,
  });
}

function resume(overrides: Partial<CandidateResume> = {}): CandidateResume {
  return Object.assign(new CandidateResume(), {
    id: 'resume-1',
    candidateProfileId: 'profile-1',
    fileName: 'cv.pdf',
    fileUrl: '/cv.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    storageKey: 'cv',
    isDefault: true,
    ...overrides,
  });
}

const actor = {
  userId: 'user-1',
  role: Role.CANDIDATE,
  ip: '127.0.0.1',
  userAgent: 'jest',
};

describe('CandidateApplicationsUseCase', () => {
  let dataSource: DataSource;
  let applications: jest.Mocked<ICandidateApplicationRepository>;
  let statuses: jest.Mocked<IApplicationStatusRepository>;
  let history: jest.Mocked<IApplicationStatusHistoryRepository>;
  let vacancies: jest.Mocked<IVacancyRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let resumes: jest.Mocked<ICandidateResumeRepository>;
  let ownership: jest.Mocked<ApplicationOwnershipService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateApplicationsUseCase;

  beforeEach(() => {
    // La transacción se ejecuta en línea: los repos son mocks, no hay BD.
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    applications = {
      // TypeORM rellena los timestamps al guardar; el mock hace lo mismo para
      // que el mapper reciba una entidad realista.
      save: jest.fn((a: CandidateApplication) => {
        a.createdAt ??= new Date();
        a.updatedAt ??= new Date();
        return Promise.resolve(a);
      }),
      existsByProfileAndVacancy: jest.fn().mockResolvedValue(false),
      findAndCountByProfile: jest.fn().mockResolvedValue([[], 0]),
    } as unknown as jest.Mocked<ICandidateApplicationRepository>;

    statuses = {
      findByCode: jest
        .fn()
        .mockImplementation((code: string) => Promise.resolve(statusRow(code))),
      findAll: jest
        .fn()
        .mockResolvedValue([statusRow(ApplicationStatusCode.IN_REVIEW)]),
    };

    history = {
      save: jest.fn((e: unknown) => Promise.resolve(e)),
      findByApplicationId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IApplicationStatusHistoryRepository>;

    vacancies = {
      findById: jest.fn().mockResolvedValue(vacancy()),
      findByIds: jest.fn().mockResolvedValue([vacancy()]),
    } as unknown as jest.Mocked<IVacancyRepository>;

    companies = {
      findById: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICompanyRepository>;

    resumes = {
      findByProfileId: jest.fn().mockResolvedValue([resume()]),
      findByIdAndProfileId: jest.fn().mockResolvedValue(resume()),
    } as unknown as jest.Mocked<ICandidateResumeRepository>;

    ownership = {
      assertCandidateRole: jest.fn(),
      requireProfile: jest.fn().mockResolvedValue(profile()),
      requireOwnApplication: jest.fn(),
    } as unknown as jest.Mocked<ApplicationOwnershipService>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new CandidateApplicationsUseCase(
      dataSource,
      applications,
      statuses,
      history,
      vacancies,
      companies,
      resumes,
      ownership,
      audit,
    );
  });

  describe('apply', () => {
    it('crea la postulación en revisión y su línea inicial de historial', async () => {
      const result = await useCase.apply({ vacancyId: 'vac-1', ...actor });

      expect(result.status?.code).toBe(ApplicationStatusCode.IN_REVIEW);
      expect(applications.save).toHaveBeenCalledTimes(1);

      const saved = applications.save.mock.calls[0][0];
      expect(saved.candidateProfileId).toBe('profile-1');
      expect(saved.vacancyId).toBe('vac-1');
      // La empresa se copia de la vacante para poder filtrar sin join.
      expect(saved.companyId).toBe('company-1');

      // El historial nace sin estado previo.
      expect(history.save).toHaveBeenCalledTimes(1);
      const entry = history.save.mock.calls[0][0];
      expect(entry.previousStatusCode).toBeNull();
      expect(entry.currentStatusCode).toBe(ApplicationStatusCode.IN_REVIEW);
      expect(entry.changedBy).toBe('user-1');

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'applications.create' }),
      );
    });

    it('adjunta la hoja de vida marcada por defecto cuando no se indica', async () => {
      resumes.findByProfileId.mockResolvedValue([
        resume({ id: 'resume-2', isDefault: false }),
        resume({ id: 'resume-3', isDefault: true }),
      ]);

      await useCase.apply({ vacancyId: 'vac-1', ...actor });

      const saved = applications.save.mock.calls[0][0];
      expect(saved.resumeId).toBe('resume-3');
    });

    it('permite postular sin hoja de vida cargada', async () => {
      resumes.findByProfileId.mockResolvedValue([]);

      await useCase.apply({ vacancyId: 'vac-1', ...actor });

      const saved = applications.save.mock.calls[0][0];
      expect(saved.resumeId).toBeNull();
    });

    it('rechaza postular a una vacante que no está activa', async () => {
      vacancies.findById.mockResolvedValue(
        vacancy({ status: VacancyStatus.CLOSED }),
      );

      try {
        await useCase.apply({ vacancyId: 'vac-1', ...actor });
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_VACANCY_NOT_ACTIVE);
      }
      expect(applications.save).not.toHaveBeenCalled();
    });

    it('rechaza la vacante inexistente', async () => {
      vacancies.findById.mockResolvedValue(null);

      try {
        await useCase.apply({ vacancyId: 'nope', ...actor });
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.VACANCY_NOT_FOUND);
      }
    });

    it('impide postularse dos veces a la misma vacante', async () => {
      applications.existsByProfileAndVacancy.mockResolvedValue(true);

      try {
        await useCase.apply({ vacancyId: 'vac-1', ...actor });
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_ALREADY_EXISTS);
      }
      expect(applications.save).not.toHaveBeenCalled();
    });

    it('rechaza una hoja de vida que no es del aspirante', async () => {
      resumes.findByIdAndProfileId.mockResolvedValue(null);

      try {
        await useCase.apply({
          vacancyId: 'vac-1',
          resumeId: 'de-otro',
          ...actor,
        });
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_RESUME_NOT_FOUND);
      }
      expect(applications.save).not.toHaveBeenCalled();
    });

    it('no deja postular a quien no es aspirante', async () => {
      ownership.assertCandidateRole.mockImplementation(() => {
        throw new AppException(403, ErrorCode.FORBIDDEN, 'no');
      });

      await expect(
        useCase.apply({ vacancyId: 'vac-1', ...actor, role: Role.EMPLOYER }),
      ).rejects.toBeInstanceOf(AppException);
      expect(applications.save).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('no expone la postulación de otro aspirante', async () => {
      ownership.requireOwnApplication.mockRejectedValue(
        new AppException(
          404,
          ErrorCode.APPLICATION_NOT_FOUND,
          'La postulación no existe.',
        ),
      );

      try {
        await useCase.get('de-otro', actor);
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.APPLICATION_NOT_FOUND);
      }
    });
  });
});
