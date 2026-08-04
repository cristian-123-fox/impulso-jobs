import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import { VacancyStatusUseCase } from '@/modules/vacancies/use-cases/vacancy-status.use-case';

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

const actor = { userId: 'user-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('VacancyStatusUseCase', () => {
  let vacancies: jest.Mocked<IVacancyRepository>;
  let ownership: jest.Mocked<VacancyOwnershipService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: VacancyStatusUseCase;
  let current: Vacancy;

  beforeEach(() => {
    current = vacancy();
    vacancies = {
      save: jest.fn((v: Vacancy) => Promise.resolve(v)),
    } as unknown as jest.Mocked<IVacancyRepository>;
    ownership = {
      requireCompany: jest.fn().mockResolvedValue({ id: 'company-1' }),
      requireOwnVacancy: jest.fn(() => Promise.resolve(current)),
    } as unknown as jest.Mocked<VacancyOwnershipService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new VacancyStatusUseCase(vacancies, ownership, audit);
  });

  describe('pause', () => {
    it('pausa y consume una pausa del plan', async () => {
      const result = await useCase.pause('vac-1', actor);

      expect(result.status).toBe(VacancyStatus.PAUSED);
      expect(result.pauseCount).toBe(1);
      expect(result.pausesLeft).toBe(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vacancies.pause' }),
      );
    });

    it('es idempotente si ya está pausada (no gasta otra pausa)', async () => {
      current = vacancy({ status: VacancyStatus.PAUSED, pauseCount: 1 });

      const result = await useCase.pause('vac-1', actor);

      expect(result.pauseCount).toBe(1);
      expect(vacancies.save).not.toHaveBeenCalled();
    });

    it('rechaza cuando se agotó el límite del plan', async () => {
      current = vacancy({ pauseCount: 2, maxPauses: 2 });

      const thrown = await useCase
        .pause('vac-1', actor)
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_PAUSE_LIMIT_REACHED);
      expect(vacancies.save).not.toHaveBeenCalled();
    });

    it('rechaza sobre una vacante cerrada', async () => {
      current = vacancy({ status: VacancyStatus.CLOSED });

      const thrown = await useCase
        .pause('vac-1', actor)
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_CLOSED);
    });
  });

  describe('reactivate', () => {
    it('reactiva y cuenta como refresco en el portal', async () => {
      current = vacancy({ status: VacancyStatus.PAUSED, pauseCount: 1 });

      const result = await useCase.reactivate('vac-1', actor);

      expect(result.status).toBe(VacancyStatus.ACTIVE);
      expect(result.refreshedAt).not.toBeNull();
      // Reactivar no devuelve la pausa consumida.
      expect(result.pauseCount).toBe(1);
    });

    it('rechaza el cambio de título si el plan no lo permite', async () => {
      current = vacancy({ status: VacancyStatus.PAUSED });

      const thrown = await useCase
        .reactivate('vac-1', actor, 'Otro título')
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_TITLE_NOT_EDITABLE);
      expect(vacancies.save).not.toHaveBeenCalled();
    });

    it('permite cambiar el título cuando el plan lo habilita', async () => {
      current = vacancy({
        status: VacancyStatus.PAUSED,
        canEditTitleOnReactivate: true,
      });

      const result = await useCase.reactivate('vac-1', actor, 'Otro título');

      expect(result.title).toBe('Otro título');
    });

    it('acepta el mismo título sin exigir permiso del plan', async () => {
      current = vacancy({ status: VacancyStatus.PAUSED });

      const result = await useCase.reactivate(
        'vac-1',
        actor,
        'Desarrollador Frontend',
      );

      expect(result.status).toBe(VacancyStatus.ACTIVE);
    });
  });

  describe('close', () => {
    it('cierra y sella la fecha', async () => {
      const result = await useCase.close('vac-1', actor);

      expect(result.status).toBe(VacancyStatus.CLOSED);
      expect(result.closedAt).not.toBeNull();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vacancies.close' }),
      );
    });

    it('es idempotente sobre una vacante ya cerrada', async () => {
      current = vacancy({ status: VacancyStatus.CLOSED, closedAt: new Date() });

      await useCase.close('vac-1', actor);

      expect(vacancies.save).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('re-sube la vacante sin gastar pausas ni cambiar el estado', async () => {
      const result = await useCase.refresh('vac-1', actor);

      expect(result.status).toBe(VacancyStatus.ACTIVE);
      expect(result.pauseCount).toBe(0);
      expect(result.refreshedAt).not.toBeNull();
    });

    it('rechaza refrescar una vacante cerrada', async () => {
      current = vacancy({ status: VacancyStatus.CLOSED });

      const thrown = await useCase
        .refresh('vac-1', actor)
        .catch((e: unknown) => e);

      expect(errorCodeOf(thrown)).toBe(ErrorCode.VACANCY_CLOSED);
    });
  });

  describe('changeStatus', () => {
    it('delega en pausar', async () => {
      const result = await useCase.changeStatus(
        'vac-1',
        VacancyStatus.PAUSED,
        actor,
      );
      expect(result.status).toBe(VacancyStatus.PAUSED);
    });

    it('delega en cerrar', async () => {
      const result = await useCase.changeStatus(
        'vac-1',
        VacancyStatus.CLOSED,
        actor,
      );
      expect(result.status).toBe(VacancyStatus.CLOSED);
    });
  });
});
