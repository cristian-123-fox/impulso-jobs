import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

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
