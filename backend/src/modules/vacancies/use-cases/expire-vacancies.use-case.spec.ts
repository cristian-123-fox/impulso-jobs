import { AuditService } from '@/modules/audit/audit.service';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { ExpireVacanciesUseCase } from '@/modules/vacancies/use-cases/expire-vacancies.use-case';

function vacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return Object.assign(new Vacancy(), {
    id: 'vac-1',
    companyId: 'company-1',
    status: VacancyStatus.ACTIVE,
    expiresAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  });
}

describe('ExpireVacanciesUseCase', () => {
  let vacancies: jest.Mocked<IVacancyRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: ExpireVacanciesUseCase;

  beforeEach(() => {
    vacancies = {
      findExpiredActive: jest.fn().mockResolvedValue([]),
      save: jest.fn((v: Vacancy) => Promise.resolve(v)),
    } as unknown as jest.Mocked<IVacancyRepository>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new ExpireVacanciesUseCase(vacancies, audit);
  });

  it('sin vencidas no toca nada', async () => {
    const summary = await useCase.execute();

    expect(summary).toEqual({ checked: 0, expired: [] });
    expect(vacancies.save).not.toHaveBeenCalled();
  });

  it('cierra la vencida, fija closedAt y audita vacancies.expire', async () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vacancies.findExpiredActive.mockResolvedValue([vacancy()]);

    const summary = await useCase.execute(now);

    expect(summary).toEqual({ checked: 1, expired: ['vac-1'] });
    const saved = vacancies.save.mock.calls[0][0];
    expect(saved.status).toBe(VacancyStatus.CLOSED);
    expect(saved.closedAt).toBe(now);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'vacancies.expire',
        entityId: 'vac-1',
      }),
    );
  });

  it('un fallo en una vacante no detiene a las demás', async () => {
    vacancies.findExpiredActive.mockResolvedValue([
      vacancy({ id: 'vac-1' }),
      vacancy({ id: 'vac-2' }),
    ]);
    vacancies.save
      .mockRejectedValueOnce(new Error('BD caída'))
      .mockImplementation((v: Vacancy) => Promise.resolve(v));

    const summary = await useCase.execute();

    expect(summary.checked).toBe(2);
    expect(summary.expired).toEqual(['vac-2']);
  });
});
