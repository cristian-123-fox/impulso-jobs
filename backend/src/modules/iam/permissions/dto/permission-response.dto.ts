import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from '@/common/types/role-scope.enum';

export class PermissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'roles.read' })
  code!: string;

  @ApiProperty({
    example: 'roles',
    description: 'Componente (primer segmento del code).',
  })
  component!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({
    example: 'Ver roles',
    description: 'Etiqueta en castellano para el árbol de permisos.',
  })
  label!: string;

  @ApiProperty({
    example: 'access',
    description: 'Grupo del catálogo (ver `groups` en la respuesta).',
  })
  group!: string;

  @ApiProperty({
    enum: RoleScope,
    isArray: true,
    description: 'Ámbitos de rol a los que se puede ofrecer este permiso.',
  })
  scopes!: RoleScope[];
}

/** Grupo del árbol de permisos. Viaja junto al listado para no duplicarlo. */
export class PermissionGroupResponseDto {
  @ApiProperty({ example: 'access' })
  key!: string;

  @ApiProperty({ example: 'Roles y permisos' })
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'Nombre de icono del kit `ij-icon`.' })
  icon!: string;

  @ApiProperty()
  order!: number;
}

/**
 * Catálogo completo: los permisos con sus metadatos, los grupos en los que se
 * ordenan y qué concede cada ámbito por sí solo.
 */
export class PermissionCatalogResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];

  @ApiProperty({ type: [PermissionGroupResponseDto] })
  groups!: PermissionGroupResponseDto[];

  @ApiProperty({
    description:
      'Códigos concedidos siempre por ámbito, sin fila en `role_permissions`.',
    example: { PLATFORM: ['catalogs.read'], COMPANY: [], CANDIDATE: [] },
  })
  baseline!: Record<RoleScope, string[]>;
}
