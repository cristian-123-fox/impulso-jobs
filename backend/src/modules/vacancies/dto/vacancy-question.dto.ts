import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { VacancyQuestion } from '@/modules/vacancies/entities/vacancy-question.entity';
import { VacancyQuestionOption } from '@/modules/vacancies/entities/vacancy-question-option.entity';
import {
  EXCLUDING_WEIGHT,
  MAX_ANSWER_WEIGHT,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_QUESTION_LENGTH,
  MAX_QUESTIONS_PER_VACANCY,
  MIN_ANSWER_WEIGHT,
  VacancyQuestionType,
} from '@/modules/vacancies/enums/vacancy-question.enums';

export class SaveVacancyQuestionOptionDto {
  @ApiProperty({ description: 'Texto de la opción de respuesta.' })
  @IsString({ message: 'La opción debe ser texto.' })
  @IsNotEmpty({ message: 'La opción no puede estar vacía.' })
  @MaxLength(MAX_OPTION_LENGTH, {
    message: 'La opción no puede superar los 200 caracteres.',
  })
  optionText!: string;

  @ApiProperty({
    description: 'Peso de la opción: -1 excluyente, 0 a 10 puntaje.',
  })
  @Type(() => Number)
  @IsInt({ message: 'El peso debe ser un entero.' })
  @Min(MIN_ANSWER_WEIGHT, { message: 'El peso mínimo es -1 (excluyente).' })
  @Max(MAX_ANSWER_WEIGHT, { message: 'El peso máximo es 10.' })
  weight!: number;
}

export class SaveVacancyQuestionDto {
  @ApiProperty({ description: 'Enunciado de la pregunta (máx. 200).' })
  @IsString({ message: 'La pregunta debe ser texto.' })
  @IsNotEmpty({ message: 'La pregunta no puede estar vacía.' })
  @MaxLength(MAX_QUESTION_LENGTH, {
    message: 'La pregunta no puede superar los 200 caracteres.',
  })
  questionText!: string;

  @ApiProperty({ enum: VacancyQuestionType })
  @IsIn(Object.values(VacancyQuestionType), {
    message: 'El tipo de pregunta no es válido.',
  })
  questionType!: VacancyQuestionType;

  @ApiPropertyOptional({
    type: [SaveVacancyQuestionOptionDto],
    description: 'Opciones (solo preguntas cerradas): de 2 a 5.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS_PER_QUESTION, {
    message: 'Una pregunta admite máximo 5 opciones.',
  })
  @ValidateNested({ each: true })
  @Type(() => SaveVacancyQuestionOptionDto)
  options?: SaveVacancyQuestionOptionDto[];
}

export class ReplaceVacancyQuestionsDto {
  @ApiProperty({ type: [SaveVacancyQuestionDto] })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS_PER_VACANCY, {
    message: 'Una vacante admite máximo 5 preguntas de filtrado.',
  })
  @ValidateNested({ each: true })
  @Type(() => SaveVacancyQuestionDto)
  questions!: SaveVacancyQuestionDto[];
}

/** Pregunta como la ve la empresa: con pesos. */
export interface CompanyVacancyQuestionDto {
  id: string;
  questionText: string;
  questionType: string;
  sortOrder: number;
  options: {
    id: string;
    optionText: string;
    weight: number;
    isExcluding: boolean;
    sortOrder: number;
  }[];
}

/** Pregunta en el portal público: SIN pesos (el candidato no debe verlos). */
export interface PublicVacancyQuestionDto {
  id: string;
  questionText: string;
  questionType: string;
  options: { id: string; optionText: string }[];
}

export function toCompanyVacancyQuestion(
  question: VacancyQuestion,
  options: VacancyQuestionOption[],
): CompanyVacancyQuestionDto {
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    sortOrder: question.sortOrder,
    options: options.map((option) => ({
      id: option.id,
      optionText: option.optionText,
      weight: option.weight,
      isExcluding: option.weight === EXCLUDING_WEIGHT,
      sortOrder: option.sortOrder,
    })),
  };
}

export function toPublicVacancyQuestion(
  question: VacancyQuestion,
  options: VacancyQuestionOption[],
): PublicVacancyQuestionDto {
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: options.map((option) => ({
      id: option.id,
      optionText: option.optionText,
    })),
  };
}
