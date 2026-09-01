import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import {
  VACANCY_REPORT_REASONS,
  VacancyReportReason,
  VacancyReportStatus,
} from '@/modules/vacancies/enums/vacancy-report.enums';

export class CreateVacancyReportDto {
  @ApiProperty({
    enum: VacancyReportReason,
    description: 'Motivo de la denuncia (catálogo cerrado).',
  })
  @IsIn(VACANCY_REPORT_REASONS, { message: 'El motivo no es válido.' })
  reasonCode!: VacancyReportReason;

  @ApiPropertyOptional({ description: 'Detalle opcional (máx. 500).' })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'El comentario no puede superar los 500 caracteres.',
  })
  comment?: string;
}

export class ListVacancyReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VacancyReportStatus })
  @IsOptional()
  @IsIn(Object.values(VacancyReportStatus), {
    message: 'El estado no es válido.',
  })
  status?: VacancyReportStatus;
}

export interface VacancyReportResponseDto {
  id: string;
  vacancyId: string;
  /** Nulo si la vacante ya no existe. */
  vacancyTitle: string | null;
  companyName: string | null;
  reasonCode: string;
  comment: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export function toVacancyReportResponse(
  report: VacancyReport,
  vacancyTitle: string | null,
  companyName: string | null,
): VacancyReportResponseDto {
  return {
    id: report.id,
    vacancyId: report.vacancyId,
    vacancyTitle,
    companyName,
    reasonCode: report.reasonCode,
    comment: report.comment ?? null,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
  };
}
