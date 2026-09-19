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
import { COUNTRY_CODES } from '@/common/catalogs/countries';
import { EDUCATION_LEVELS } from '@/modules/candidates/dto/candidate-profile.dto';

/** Tope razonable para el filtro de experiencia; evita fechas absurdas. */
const MAX_EXPERIENCE_YEARS = 50;

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class SearchCandidatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Coincidencia parcial sobre nombre, apellido o título.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  /**
   * País del aspirante (T36). Sin filtrar, salen los de los cuatro países.
   * **Es lo que da sentido a `state`**: los códigos de subdivisión colisionan
   * entre países (`GUA` es Guanajuato y Guainía; `DC`, District of Columbia y
   * Bogotá D.C.), así que filtrar por estado sin país devolvería mezcla.
   */
  @ApiPropertyOptional({ enum: [...COUNTRY_CODES] })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], { message: 'El país no está disponible.' })
  country?: string;

  /**
   * Código de la subdivisión, dentro del país indicado. La lista válida depende
   * de `country`, así que la comprueba el caso de uso.
   */
  @ApiPropertyOptional({
    description: 'Código de la subdivisión (estado, departamento o provincia).',
  })
  @IsOptional()
  @Transform(toUpper)
  @IsString()
  @Length(1, 10)
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
