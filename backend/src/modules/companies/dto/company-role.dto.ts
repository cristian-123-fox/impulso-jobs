import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Alta o edición de un rol de empresa: nombre y permisos, en un solo envío. */
export class SaveCompanyRoleDto {
  @ApiProperty({ example: 'Reclutador junior' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ponle un nombre al rol.' })
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres.' })
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255, {
    message: 'La descripción no puede superar los 255 caracteres.',
  })
  description?: string;

  @ApiProperty({
    type: [String],
    description:
      'Códigos de permiso. Sólo se aceptan los de `GET /company/roles/permissions`.',
    example: ['vacancies.read', 'applications.read'],
  })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissionCodes!: string[];
}

/** Un permiso tal como se le ofrece a la empresa. */
export interface CompanyPermissionDto {
  code: string;
  label: string;
  description: string;
  group: string;
  /** Concedido siempre a cualquier rol de empresa: se pinta bloqueado. */
  locked: boolean;
}

export interface CompanyPermissionGroupDto {
  key: string;
  label: string;
  description: string;
  icon: string;
  order: number;
}

/** Catálogo de lo que una empresa puede repartir entre sus roles. */
export interface CompanyPermissionCatalogDto {
  groups: CompanyPermissionGroupDto[];
  permissions: CompanyPermissionDto[];
}

export interface CompanyRoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  /** Permisos asignados a mano (no incluye los fijos del ámbito). */
  permissionCodes: string[];
  /** Personas del equipo que tienen el rol. */
  memberCount: number;
  createdAt: string;
}
