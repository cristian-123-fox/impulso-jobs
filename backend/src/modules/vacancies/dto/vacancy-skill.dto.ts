import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Skill } from '@/modules/vacancies/entities/skill.entity';
import { VacancySkill } from '@/modules/vacancies/entities/vacancy-skill.entity';

/** Tope razonable de skills por vacante (T25). */
export const MAX_SKILLS_PER_VACANCY = 15;

export class SaveVacancySkillDto {
  @ApiProperty({
    description: 'ID de una skill existente o null si es una nueva (ver name).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  skillId?: string;

  @ApiProperty({
    description:
      'Nombre de la skill. Si skillId está presente, se ignora; si no, se crea o reutiliza por nombre.',
  })
  @IsString({ message: 'El nombre de la skill debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre de la skill no puede estar vacío.' })
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Indica si la skill es obligatoria para la posición.',
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    default: 0,
    description: 'Orden de presentación en el portal.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class ReplaceVacancySkillsDto {
  @ApiProperty({ type: [SaveVacancySkillDto] })
  @IsArray()
  @ArrayMaxSize(MAX_SKILLS_PER_VACANCY, {
    message: 'Una vacante admite máximo 15 skills.',
  })
  @ValidateNested({ each: true })
  @Type(() => SaveVacancySkillDto)
  skills!: SaveVacancySkillDto[];
}

/** Skill como la ve la empresa. */
export interface CompanyVacancySkillDto {
  id: string;
  skillId: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
}

/** Skill en el portal público. */
export interface PublicVacancySkillDto {
  id: string;
  name: string;
  isRequired: boolean;
}

export function toCompanyVacancySkill(
  vacancySkill: VacancySkill,
  skill: Skill,
): CompanyVacancySkillDto {
  return {
    id: vacancySkill.id,
    skillId: vacancySkill.skillId,
    name: skill.name,
    isRequired: vacancySkill.isRequired,
    sortOrder: vacancySkill.sortOrder,
  };
}

export function toPublicVacancySkill(
  vacancySkill: VacancySkill,
  skill: Skill,
): PublicVacancySkillDto {
  return {
    id: vacancySkill.id,
    name: skill.name,
    isRequired: vacancySkill.isRequired,
  };
}
