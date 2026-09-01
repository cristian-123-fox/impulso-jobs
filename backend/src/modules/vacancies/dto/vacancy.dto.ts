import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { PROFESSIONAL_AREA_IDS } from '@/common/catalogs/professional-areas';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import {
  CONTRACT_TYPES,
  ContractType,
  EDUCATION_LEVELS,
  EducationLevel,
  EMPLOYMENT_TYPES,
  EmploymentType,
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  PUBLIC_VACANCY_SORTS,
  PublicVacancySort,
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

  @ApiProperty({
    example: 13,
    description: 'Área profesional (catálogo embebido de 23 áreas).',
  })
  @Type(() => Number)
  @IsInt({ message: 'El área profesional debe ser un número.' })
  @IsIn([...PROFESSIONAL_AREA_IDS], {
    message: 'El área profesional no es válida.',
  })
  professionalAreaId!: number;

  @ApiPropertyOptional({ default: 1, description: 'Número de plazas.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de plazas debe ser un entero.' })
  @Min(1)
  @Max(999)
  positionsCount?: number;

  @ApiProperty({ enum: [...CONTRACT_TYPES] })
  @IsIn([...CONTRACT_TYPES], { message: 'El tipo de contrato no es válido.' })
  contractType!: ContractType;

  @ApiPropertyOptional({
    enum: [...EDUCATION_LEVELS],
    description: 'Escolaridad mínima; omitir = sin requisito.',
  })
  @IsOptional()
  @IsIn([...EDUCATION_LEVELS], { message: 'La escolaridad no es válida.' })
  minEducationLevel?: EducationLevel;

  @ApiPropertyOptional({
    default: false,
    description: 'El puesto paga comisiones además del salario base.',
  })
  @IsOptional()
  @IsBoolean()
  hasCommissions?: boolean;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Fecha límite para postularse (YYYY-MM-DD, inclusive).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha límite debe tener formato YYYY-MM-DD.',
  })
  applicationDeadline?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El área profesional debe ser un número.' })
  @IsIn([...PROFESSIONAL_AREA_IDS], {
    message: 'El área profesional no es válida.',
  })
  areaId?: number;

  /** Vacantes que pagan al menos esta cifra (MXN mensuales). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El salario debe ser un número entero.' })
  @Min(0)
  @Max(MAX_MONTHLY_SALARY)
  salaryMin?: number;

  /** Publicadas en los últimos N días. */
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 3, 7, 15, 30], { message: 'El rango de fechas no es válido.' })
  publishedWithinDays?: number;

  @IsOptional()
  @IsIn([...PUBLIC_VACANCY_SORTS], { message: 'El orden no es válido.' })
  sort?: PublicVacancySort;
}
