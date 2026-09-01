import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/modules/audit/audit.service';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

export interface VacancyExpirationSummary {
  checked: number;
  expired: string[];
}

/**
 * T20: cierra las vacantes activas cuya vigencia (`expires_at`) ya venció.
 * La vigencia se comunica en la ficha desde el día 1, así que el cierre no
 * sorprende a nadie; las postulaciones recibidas siguen siendo legibles por
 * la empresa (decisión explícita: no copiar el bloqueo de Computrabajo).
 *
 * Sin planificador instalado: se invoca desde `pnpm vacancies:expire`, igual
 * que `billing:expire`. En cPanel se engancha a un cron del servidor.
 */
@Injectable()
export class ExpireVacanciesUseCase {
  private readonly logger = new Logger(ExpireVacanciesUseCase.name);

  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(now = new Date()): Promise<VacancyExpirationSummary> {
    const due = await this.vacancies.findExpiredActive(now);
    if (due.length === 0) {
      return { checked: 0, expired: [] };
    }

    const expired: string[] = [];
    for (const vacancy of due) {
      // Una vacante a la vez: si una falla, las demás siguen.
      try {
        vacancy.status = VacancyStatus.CLOSED;
        vacancy.closedAt = now;
        await this.vacancies.save(vacancy);
        await this.audit.record({
          action: 'vacancies.expire',
          entity: 'vacancy',
          entityId: vacancy.id,
          metadata: {
            companyId: vacancy.companyId,
            expiresAt: vacancy.expiresAt?.toISOString() ?? null,
          },
        });
        expired.push(vacancy.id);
      } catch (error) {
        this.logger.error(
          `No se pudo expirar la vacante ${vacancy.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { checked: due.length, expired };
  }
}
