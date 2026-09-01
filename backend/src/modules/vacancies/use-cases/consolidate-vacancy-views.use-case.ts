import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from '@/common/utils/transaction.util';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import {
  type IVacancyViewEventRepository,
  VACANCY_VIEW_EVENT_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';

export interface ViewConsolidationSummary {
  /** Vacantes cuyo contador cambió. */
  vacancies: number;
  /** Vistas sumadas en total. */
  views: number;
}

/**
 * T18: suma los eventos de `vacancy_view_events` a `vacancies.views_count` y
 * los borra, en una sola transacción (si algo falla, los eventos siguen ahí y
 * la próxima corrida los recoge — nunca se cuentan dos veces ni se pierden).
 *
 * El corte es "ahora": no hay contadores calientes, la UI avisa que las
 * vistas se actualizan una vez al día. Se invoca desde `pnpm views:consolidate`
 * (cron en cPanel), igual que `billing:expire` y `vacancies:expire`.
 */
@Injectable()
export class ConsolidateVacancyViewsUseCase {
  private readonly logger = new Logger(ConsolidateVacancyViewsUseCase.name);

  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(VACANCY_VIEW_EVENT_REPOSITORY)
    private readonly viewEvents: IVacancyViewEventRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(now = new Date()): Promise<ViewConsolidationSummary> {
    const groups = await this.viewEvents.countGroupedUntil(now);
    if (groups.length === 0) {
      return { vacancies: 0, views: 0 };
    }

    await runInTransaction(this.dataSource, async (manager) => {
      for (const group of groups) {
        // Si la vacante ya no existe, el UPDATE no afecta filas y no pasa nada.
        await this.vacancies.incrementViews(
          group.vacancyId,
          group.views,
          manager,
        );
      }
      await this.viewEvents.deleteUntil(now, manager);
    });

    const views = groups.reduce((sum, group) => sum + group.views, 0);
    this.logger.log(
      `Vistas consolidadas: ${views} en ${groups.length} vacantes.`,
    );
    return { vacancies: groups.length, views };
  }
}
