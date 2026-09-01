import { DataSource } from 'typeorm';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { IVacancyViewEventRepository } from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';
import { ConsolidateVacancyViewsUseCase } from '@/modules/vacancies/use-cases/consolidate-vacancy-views.use-case';

describe('ConsolidateVacancyViewsUseCase', () => {
  let vacancies: jest.Mocked<IVacancyRepository>;
  let viewEvents: jest.Mocked<IVacancyViewEventRepository>;
  let dataSource: jest.Mocked<DataSource>;
  let useCase: ConsolidateVacancyViewsUseCase;

  beforeEach(() => {
    vacancies = {
      incrementViews: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IVacancyRepository>;
    viewEvents = {
      countGroupedUntil: jest.fn().mockResolvedValue([]),
      deleteUntil: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IVacancyViewEventRepository>;
    dataSource = {
      transaction: jest.fn((run: (manager: unknown) => Promise<unknown>) =>
        run({}),
      ),
    } as unknown as jest.Mocked<DataSource>;

    useCase = new ConsolidateVacancyViewsUseCase(
      vacancies,
      viewEvents,
      dataSource,
    );
  });

  it('sin eventos no abre transacción', async () => {
    const summary = await useCase.execute();

    expect(summary).toEqual({ vacancies: 0, views: 0 });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('suma por vacante y borra los eventos consolidados', async () => {
    const now = new Date('2026-08-31T06:00:00Z');
    viewEvents.countGroupedUntil.mockResolvedValue([
      { vacancyId: 'vac-1', views: 12 },
      { vacancyId: 'vac-2', views: 3 },
    ]);

    const summary = await useCase.execute(now);

    expect(summary).toEqual({ vacancies: 2, views: 15 });
    expect(vacancies.incrementViews).toHaveBeenCalledWith(
      'vac-1',
      12,
      expect.anything(),
    );
    expect(vacancies.incrementViews).toHaveBeenCalledWith(
      'vac-2',
      3,
      expect.anything(),
    );
    // El borrado usa el MISMO corte que el conteo: nada se pierde ni se duplica.
    expect(viewEvents.deleteUntil).toHaveBeenCalledWith(now, expect.anything());
  });
});
