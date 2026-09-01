import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  VacancyResponseDto,
  toVacancyResponse,
} from '@/modules/vacancies/dto/vacancy-response.dto';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  DEFAULT_MAX_PAUSES,
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface VacancyActor {
  userId: string;
  ip: string;
  userAgent: string;
}

export interface VacancyData {
  title: string;
  description: string;
  requirements?: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  state: string;
  municipality: string;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden?: boolean;
  /** Sólo se honra si el plan otorgó `canBeConfidential`. */
  isConfidential?: boolean;
}

export interface ListCompanyVacanciesCommand extends VacancyActor {
  search?: string;
  status?: VacancyStatus;
  page: number;
  limit: number;
}

export interface CompanyVacancyStats {
  total: number;
  active: number;
  paused: number;
  closed: number;
}

export interface ListCompanyVacanciesResult extends PaginatedResponse<VacancyResponseDto> {
  stats: CompanyVacancyStats;
}

/**
 * HU-017: gestión de las vacantes propias de la empresa. Toda operación pasa
 * por `VacancyOwnershipService`, que exige cuenta activa y propiedad; una
 * vacante ajena responde 404, nunca 403, para no revelar que existe.
 *
 * Las transiciones de estado viven en `VacancyStatusUseCase`.
 */
@Injectable()
export class CompanyVacanciesUseCase {
  constructor(
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async list(
    command: ListCompanyVacanciesCommand,
  ): Promise<ListCompanyVacanciesResult> {
    const company = await this.ownership.requireCompany(command.userId);

    const [rows, total] = await this.vacancies.findAndCountByCompany({
      companyId: company.id,
      search: command.search,
      status: command.status,
      page: command.page,
      limit: command.limit,
    });

    const [all, active, paused, closed] = await Promise.all([
      this.vacancies.countByCompany(company.id),
      this.vacancies.countByCompany(company.id, VacancyStatus.ACTIVE),
      this.vacancies.countByCompany(company.id, VacancyStatus.PAUSED),
      this.vacancies.countByCompany(company.id, VacancyStatus.CLOSED),
    ]);

    return {
      ...toPaginated(
        rows.map(toVacancyResponse),
        total,
        command.page,
        command.limit,
      ),
      stats: { total: all, active, paused, closed },
    };
  }

  async get(id: string, actor: VacancyActor): Promise<VacancyResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(id, company.id);
    return toVacancyResponse(vacancy);
  }

  async create(
    data: VacancyData,
    actor: VacancyActor,
  ): Promise<VacancyResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    this.assertSalaryRange(data);

    const now = new Date();
    const vacancy = new Vacancy();
    vacancy.companyId = company.id;
    this.apply(vacancy, data);
    vacancy.status = VacancyStatus.ACTIVE;
    vacancy.publishedAt = now;
    // Se rellena desde el alta para que el orden del portal no dependa de nulos.
    vacancy.refreshedAt = now;
    vacancy.pauseCount = 0;
    vacancy.maxPauses = DEFAULT_MAX_PAUSES;
    // Los distintivos los otorga la promoción (M14). Se fijan aquí en su valor
    // neutro en vez de confiar en el `default` de la columna, para que la
    // respuesta del alta sea la misma con o sin base de datos de por medio.
    vacancy.isVerified = false;
    vacancy.isFeatured = false;
    vacancy.isUrgent = false;
    vacancy.isConfidential = false;
    vacancy.canBeConfidential = false;
    vacancy.screeningEnabled = false;
    vacancy.canEditTitleOnReactivate = false;
    // Al crear aún no hay promoción, así que pedir confidencialidad falla aquí.
    this.applyConfidentiality(vacancy, data.isConfidential);

    const saved = await this.vacancies.save(vacancy);
    await this.audit.record({
      action: 'vacancies.create',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { companyId: company.id, title: saved.title },
    });

    return toVacancyResponse(saved);
  }

  async update(
    id: string,
    data: VacancyData,
    actor: VacancyActor,
  ): Promise<VacancyResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(id, company.id);

    if (vacancy.status === VacancyStatus.CLOSED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_CLOSED,
        'Una vacante cerrada no se puede editar.',
      );
    }
    this.assertSalaryRange(data);

    this.apply(vacancy, data);
    this.applyConfidentiality(vacancy, data.isConfidential);
    const saved = await this.vacancies.save(vacancy);

    await this.audit.record({
      action: 'vacancies.update',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { companyId: company.id },
    });

    return toVacancyResponse(saved);
  }

  /** Copia los campos editables. Los distintivos y el plan no se tocan aquí. */
  private apply(vacancy: Vacancy, data: VacancyData): void {
    vacancy.title = data.title.trim();
    vacancy.description = data.description.trim();
    vacancy.requirements = data.requirements?.trim() || null;
    vacancy.employmentType = data.employmentType;
    vacancy.workMode = data.workMode;
    vacancy.state = data.state;
    vacancy.municipality = data.municipality.trim();
    vacancy.experienceLevel = data.experienceLevel;
    vacancy.salaryMin = data.salaryMin?.toString() ?? null;
    vacancy.salaryMax = data.salaryMax?.toString() ?? null;
    vacancy.salaryHidden = data.salaryHidden ?? false;
  }

  /**
   * La confidencialidad la decide la empresa, pero la CAPACIDAD viene del plan
   * (`urgent_confidential_badge`). Apagarla siempre está permitido.
   */
  private applyConfidentiality(vacancy: Vacancy, requested?: boolean): void {
    if (requested === undefined || requested === vacancy.isConfidential) {
      return;
    }
    if (requested && !vacancy.canBeConfidential) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.VACANCY_CONFIDENTIAL_NOT_ENABLED,
        'La confidencialidad es un beneficio del plan contratado.',
      );
    }
    vacancy.isConfidential = requested;
  }

  private assertSalaryRange(data: VacancyData): void {
    if (
      data.salaryMin !== undefined &&
      data.salaryMax !== undefined &&
      data.salaryMin > data.salaryMax
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VACANCY_INVALID_SALARY_RANGE,
        'El salario mínimo no puede ser mayor que el máximo.',
      );
    }
  }
}
