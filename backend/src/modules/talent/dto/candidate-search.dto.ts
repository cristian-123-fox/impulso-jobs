import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { EDUCATION_LEVELS } from '@/modules/candidates/dto/candidate-profile.dto';

/** Tope razonable para el filtro de experiencia; evita fechas absurdas. */
const MAX_EXPERIENCE_YEARS = 50;

export class SearchCandidatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Coincidencia parcial sobre nombre, apellido o título.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @ApiPropertyOptional({ description: 'Código ISO 3166-2:MX del estado.' })
  @IsOptional()
  @IsIn([...MX_STATE_CODES], { message: 'El estado no es válido.' })
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  municipality?: string;

  @ApiPropertyOptional({ enum: EDUCATION_LEVELS })
  @IsOptional()
  @IsIn([...EDUCATION_LEVELS], {
    message: 'El nivel de formación no es válido.',
  })
  educationLevel?: string;

  @ApiPropertyOptional({ description: 'Código ISO del idioma, p. ej. "en".' })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  languageCode?: string;

  @ApiPropertyOptional({ description: 'Coincidencia parcial sobre habilidad.' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  skill?: string;

  @ApiPropertyOptional({
    description:
      'Años mínimos desde el primer empleo registrado (aproxima la experiencia total).',
    minimum: 0,
    maximum: MAX_EXPERIENCE_YEARS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_EXPERIENCE_YEARS)
  minExperienceYears?: number;

  @ApiPropertyOptional({ description: 'Solo disponibilidad inmediata.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  immediatelyAvailable?: boolean;
}
