import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  VacancyResponseDto,
  toVacancyResponse,
} from '@/modules/vacancies/dto/vacancy-response.dto';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import { VacancyActor } from '@/modules/vacancies/use-cases/company-vacancies.use-case';

/**
 * Transiciones de estado de una vacante y el refresco del listado.
 *
 * Reglas (HU-017):
 * - `CLOSED` es terminal: no se edita ni se reabre.
 * - Pausar consume una pausa del plan (`pause_count` contra `max_pauses`).
 * - Al reactivar sólo se puede cambiar el título si el plan lo permite.
 * - Refrescar re-sube la vacante en el portal sin gastar pausas.
 */
@Injectable()
export class VacancyStatusUseCase {
  private readonly logger = new Logger(VacancyStatusUseCase.name);

  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  /** Cambio explícito de estado; delega en pausar/reactivar/cerrar. */
  async changeStatus(
    id: string,
    status: VacancyStatus,
    actor: VacancyActor,
  ): Promise<VacancyResponseDto> {
    switch (status) {
      case VacancyStatus.PAUSED:
        return this.pause(id, actor);
      case VacancyStatus.ACTIVE:
        return this.reactivate(id, actor);
      case VacancyStatus.CLOSED:
        return this.close(id, actor);
      default:
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.VACANCY_INVALID_STATUS_CHANGE,
          'El estado solicitado no es válido.',
        );
    }
  }

  async pause(id: string, actor: VacancyActor): Promise<VacancyResponseDto> {
    const vacancy = await this.load(id, actor);
    this.assertNotClosed(vacancy);

    if (vacancy.status === VacancyStatus.PAUSED) {
      return toVacancyResponse(vacancy);
    }
    if (vacancy.pauseCount >= vacancy.maxPauses) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_PAUSE_LIMIT_REACHED,
        `Has alcanzado el límite de ${vacancy.maxPauses} pausas de tu plan para esta vacante.`,
      );
    }

    vacancy.status = VacancyStatus.PAUSED;
    vacancy.pauseCount += 1;

    return this.saveAndAudit(vacancy, 'vacancies.pause', actor, {
      pauseCount: vacancy.pauseCount,
      maxPauses: vacancy.maxPauses,
    });
  }

  /**
   * Reactiva la vacante. El título sólo se acepta si el plan lo permite; se
   * rechaza el intento en vez de ignorarlo, para que la empresa no crea que
   * guardó un cambio que no ocurrió.
   */
  async reactivate(
    id: string,
    actor: VacancyActor,
    title?: string,
  ): Promise<VacancyResponseDto> {
    const vacancy = await this.load(id, actor);
    this.assertNotClosed(vacancy);

    const newTitle = title?.trim();
    const titleChanged = Boolean(newTitle && newTitle !== vacancy.title);
    if (titleChanged) {
      if (!vacancy.canEditTitleOnReactivate) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.VACANCY_TITLE_NOT_EDITABLE,
          'Tu plan no permite cambiar el título al reactivar la vacante.',
        );
      }
      vacancy.title = newTitle!;
    }

    vacancy.status = VacancyStatus.ACTIVE;
    // Reactivar devuelve visibilidad: cuenta como refresco en el portal.
    vacancy.refreshedAt = new Date();

    return this.saveAndAudit(vacancy, 'vacancies.reactivate', actor, {
      titleChanged,
    });
  }

  async close(id: string, actor: VacancyActor): Promise<VacancyResponseDto> {
    const vacancy = await this.load(id, actor);

    if (vacancy.status === VacancyStatus.CLOSED) {
      return toVacancyResponse(vacancy);
    }

    vacancy.status = VacancyStatus.CLOSED;
    vacancy.closedAt = new Date();

    const result = await this.saveAndAudit(vacancy, 'vacancies.close', actor, {
      closedAt: vacancy.closedAt.toISOString(),
    });

    // M16 enviará aquí el aviso automático a los no seleccionados. Queda el
    // rastro en el log hasta que ese módulo exista.
    this.logger.log(
      `Vacante ${vacancy.id} cerrada: pendiente el aviso a no seleccionados (M16).`,
    );

    return result;
  }

  /** Re-sube la vacante en el portal. No consume pausas ni cambia el estado. */
  async refresh(id: string, actor: VacancyActor): Promise<VacancyResponseDto> {
    const vacancy = await this.load(id, actor);
    this.assertNotClosed(vacancy);

    vacancy.refreshedAt = new Date();
    return this.saveAndAudit(vacancy, 'vacancies.refresh', actor, {});
  }

  private async load(id: string, actor: VacancyActor): Promise<Vacancy> {
    const company = await this.ownership.requireCompany(actor.userId);
    return this.ownership.requireOwnVacancy(id, company.id);
  }

  private assertNotClosed(vacancy: Vacancy): void {
    if (vacancy.status === VacancyStatus.CLOSED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_CLOSED,
        'Una vacante cerrada no se puede modificar.',
      );
    }
  }

  private async saveAndAudit(
    vacancy: Vacancy,
    action: string,
    actor: VacancyActor,
    metadata: Record<string, unknown>,
  ): Promise<VacancyResponseDto> {
    const saved = await this.vacancies.save(vacancy);
    await this.audit.record({
      action,
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { ...metadata, status: saved.status },
    });
    return toVacancyResponse(saved);
  }
}
