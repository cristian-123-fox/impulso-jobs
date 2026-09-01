import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import {
  EMPLOYMENT_TYPES,
  EmploymentType,
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  VACANCY_STATUSES,
  VacancyStatus,
  WORK_MODES,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';

/** Salario mensual máximo admitido en MXN (tope de cordura, no de negocio). */
const MAX_MONTHLY_SALARY = 10_000_000;

/**
 * Alta y edición de vacante. No incluye los distintivos (`isFeatured`,
 * `isUrgent`, `isConfidential`) ni `maxPauses`: los deriva el plan (M14).
 */
export class SaveVacancyDto {
  @ApiProperty({ example: 'Desarrollador Frontend Sr.' })
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  @MaxLength(160)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @MaxLength(10_000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  requirements?: string;

  @ApiProperty({ enum: [...EMPLOYMENT_TYPES] })
  @IsIn([...EMPLOYMENT_TYPES], {
    message: 'El tipo de contratación no es válido.',
  })
  employmentType!: EmploymentType;

  @ApiProperty({ enum: [...WORK_MODES] })
  @IsIn([...WORK_MODES], { message: 'La modalidad no es válida.' })
  workMode!: WorkMode;

  @ApiProperty({ example: 'JAL' })
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state!: string;

  @ApiProperty({ example: 'Zapopan' })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @MaxLength(120)
  municipality!: string;

  @ApiProperty({ enum: [...EXPERIENCE_LEVELS] })
  @IsIn([...EXPERIENCE_LEVELS], {
    message: 'El nivel de experiencia no es válido.',
  })
  experienceLevel!: ExperienceLevel;

  @ApiPropertyOptional({ description: 'Salario mensual mínimo en MXN.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El salario mínimo debe ser un número entero.' })
  @Min(0)
  @Max(MAX_MONTHLY_SALARY)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Salario mensual máximo en MXN.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El salario máximo debe ser un número entero.' })
  @Min(0)
  @Max(MAX_MONTHLY_SALARY)
  salaryMax?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  salaryHidden?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Oculta la identidad de la empresa en el portal. Requiere el beneficio del plan (urgent_confidential_badge).',
  })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;
}

/** Cambio de estado explícito (cerrar, reactivar desde cerrada no aplica). */
export class ChangeVacancyStatusDto {
  @ApiProperty({ enum: [...VACANCY_STATUSES] })
  @IsIn([...VACANCY_STATUSES], { message: 'El estado no es válido.' })
  status!: VacancyStatus;
}

/** Reactivar: el título sólo viaja si el plan permite editarlo. */
export class ReactivateVacancyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El título no puede quedar vacío.' })
  @MaxLength(160)
  title?: string;
}

export class ListCompanyVacanciesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsIn([...VACANCY_STATUSES], { message: 'El estado no es válido.' })
  status?: VacancyStatus;
}

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListPublicVacanciesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @IsOptional()
  @IsIn([...EMPLOYMENT_TYPES], {
    message: 'El tipo de contratación no es válido.',
  })
  employmentType?: EmploymentType;

  @IsOptional()
  @IsIn([...WORK_MODES], { message: 'La modalidad no es válida.' })
  workMode?: WorkMode;

  @IsOptional()
  @IsIn([...EXPERIENCE_LEVELS], {
    message: 'El nivel de experiencia no es válido.',
  })
  experienceLevel?: ExperienceLevel;
}
