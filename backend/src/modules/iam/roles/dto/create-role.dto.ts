import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { RoleScope } from '@/common/types/role-scope.enum';

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

  /**
   * `CANDIDATE` no se acepta: el aspirante no tiene roles administrables, sus
   * permisos están fijados en código (`SCOPE_BASELINE`).
   */
  @ApiProperty({
    enum: [RoleScope.PLATFORM, RoleScope.COMPANY],
    example: RoleScope.PLATFORM,
    description: 'A quién sirve el rol. Inmutable una vez creado.',
  })
  @IsIn([RoleScope.PLATFORM, RoleScope.COMPANY], {
    message: 'El ámbito debe ser PLATFORM o COMPANY.',
  })
  scope!: RoleScope.PLATFORM | RoleScope.COMPANY;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
