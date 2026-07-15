import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'CONTENT_MANAGER' })
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio.' })
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'El código debe ser MAYÚSCULAS, números o guion bajo (ej. CONTENT_MANAGER).',
  })
  code!: string;

  @ApiProperty({ example: 'Gestor de contenidos' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(80)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
