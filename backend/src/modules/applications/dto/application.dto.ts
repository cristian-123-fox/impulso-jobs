import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

/** Respuesta a una pregunta de filtrado de la vacante (M15). */
export class CreateApplicationAnswerDto {
  @ApiProperty({ description: 'Pregunta de la vacante que se responde.' })
  @IsUUID()
  questionId!: string;

  @ApiPropertyOptional({ description: 'Opción elegida (pregunta cerrada).' })
  @IsOptional()
  @IsUUID()
  optionId?: string;

  @ApiPropertyOptional({ description: 'Respuesta libre (pregunta abierta).' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'La respuesta no puede superar los 1000 caracteres.',
  })
  answerText?: string;
}

export class CreateApplicationDto {
  @ApiProperty({ description: 'Vacante a la que se postula el aspirante.' })
  @IsUUID()
  vacancyId!: string;

  @ApiPropertyOptional({
    description:
      'Hoja de vida a adjuntar. Si se omite, se usa la marcada por defecto.',
  })
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional({
    type: [CreateApplicationAnswerDto],
    description:
      'Respuestas a las preguntas de filtrado. Obligatorias si la vacante las tiene.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationAnswerDto)
  answers?: CreateApplicationAnswerDto[];
}

export class ListCandidateApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Código del estado a filtrar.' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;
}

export class ListCompanyApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Acota a una vacante de la empresa.' })
  @IsOptional()
  @IsUUID()
  vacancyId?: string;

  @ApiPropertyOptional({ description: 'Código del estado a filtrar.' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;
}

export class ChangeApplicationStatusDto {
  @ApiProperty({
    description: 'Código del nuevo estado, tomado del catálogo.',
    example: 'INTERVIEW',
  })
  @IsString()
  @Length(1, 30)
  status!: string;
}
