import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SortableQueryDto } from '@/common/dto/sortable-query.dto';
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

/** Lista blanca de columnas ordenables. Ver `buildOrder`. */
export const VACANCY_REPORT_SORT_COLUMNS = {
  status: 'status',
  reasonCode: 'reasonCode',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt',
} as const;

export const VACANCY_REPORT_SORT_KEYS = Object.keys(
  VACANCY_REPORT_SORT_COLUMNS,
) as (keyof typeof VACANCY_REPORT_SORT_COLUMNS)[];

export type VacancyReportSortKey = keyof typeof VACANCY_REPORT_SORT_COLUMNS;

export class ListVacancyReportsQueryDto extends SortableQueryDto {
  @ApiPropertyOptional({ enum: VacancyReportStatus })
  @IsOptional()
  @IsIn(Object.values(VacancyReportStatus), {
    message: 'El estado no es válido.',
  })
  status?: VacancyReportStatus;

  @ApiPropertyOptional({ enum: VACANCY_REPORT_SORT_KEYS })
  @IsOptional()
  @IsIn(VACANCY_REPORT_SORT_KEYS, {
    message: 'La columna de orden no es válida.',
  })
  sortBy?: VacancyReportSortKey;
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
