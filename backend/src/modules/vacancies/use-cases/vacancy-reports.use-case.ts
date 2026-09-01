import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  CreateVacancyReportDto,
  ListVacancyReportsQueryDto,
  VacancyReportResponseDto,
  toVacancyReportResponse,
} from '@/modules/vacancies/dto/vacancy-report.dto';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import { VacancyReportStatus } from '@/modules/vacancies/enums/vacancy-report.enums';
import {
  type IVacancyReportRepository,
  VACANCY_REPORT_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-report.repository.interface';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

export interface VacancyReportActor {
  userId: string;
  role: Role;
  ip: string;
  userAgent: string;
}

/**
 * Denuncias de vacantes. El candidato reporta; el back-office revisa la cola.
 * "Piden dinero" y "no responden" son además señal de calidad del empleador.
 */
@Injectable()
export class VacancyReportsUseCase {
  constructor(
    @Inject(VACANCY_REPORT_REPOSITORY)
    private readonly reports: IVacancyReportRepository,
    @Inject(VACANCY_REPOSITORY)
    private readonly vacancies: IVacancyRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companies: ICompanyRepository,
    private readonly audit: AuditService,
  ) {}

  async report(
    vacancyId: string,
    dto: CreateVacancyReportDto,
    actor: VacancyReportActor,
  ): Promise<VacancyReportResponseDto> {
    if (actor.role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden denunciar una vacante.',
      );
    }

    const vacancy = await this.vacancies.findById(vacancyId);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no existe.',
      );
    }

    const alreadyReported = await this.reports.existsByVacancyAndReporter(
      vacancyId,
      actor.userId,
    );
    if (alreadyReported) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_REPORT_DUPLICATED,
        'Ya denunciaste esta vacante.',
      );
    }

    const report = Object.assign(new VacancyReport(), {
      vacancyId,
      reporterUserId: actor.userId,
      reasonCode: dto.reasonCode,
      comment: dto.comment?.trim() || null,
      status: VacancyReportStatus.PENDING,
    });
    const saved = await this.reports.save(report);

    await this.audit.record({
      action: 'vacancies.report',
      actorUserId: actor.userId,
      entity: 'vacancy_report',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { vacancyId, reasonCode: dto.reasonCode },
    });

    return toVacancyReportResponse(saved, vacancy.title, null);
  }

  async listForAdmin(
    query: ListVacancyReportsQueryDto,
  ): Promise<PaginatedResponse<VacancyReportResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [rows, total] = await this.reports.findAndCount({
      status: query.status,
      page,
      limit,
    });

    const vacancyIds = [...new Set(rows.map((row) => row.vacancyId))];
    const vacancies = await this.vacancies.findByIds(vacancyIds);
    const vacancyById = new Map(vacancies.map((item) => [item.id, item]));
    const companies = await this.companies.findByIds([
      ...new Set(vacancies.map((item) => item.companyId)),
    ]);
    const companyById = new Map(companies.map((item) => [item.id, item]));

    const items = rows.map((row) => {
      const vacancy = vacancyById.get(row.vacancyId);
      const company = vacancy ? companyById.get(vacancy.companyId) : undefined;
      return toVacancyReportResponse(
        row,
        vacancy?.title ?? null,
        company?.businessName ?? null,
      );
    });

    return toPaginated(items, total, page, limit);
  }

  async resolve(
    id: string,
    actor: Pick<VacancyReportActor, 'userId' | 'ip' | 'userAgent'>,
  ): Promise<VacancyReportResponseDto> {
    const report = await this.reports.findById(id);
    if (!report) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_REPORT_NOT_FOUND,
        'La denuncia no existe.',
      );
    }

    if (report.status !== VacancyReportStatus.RESOLVED) {
      report.status = VacancyReportStatus.RESOLVED;
      report.resolvedAt = new Date();
      await this.reports.save(report);
      await this.audit.record({
        action: 'vacancies.report.resolve',
        actorUserId: actor.userId,
        entity: 'vacancy_report',
        entityId: report.id,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
    }

    const vacancy = await this.vacancies.findById(report.vacancyId);
    return toVacancyReportResponse(report, vacancy?.title ?? null, null);
  }
}
