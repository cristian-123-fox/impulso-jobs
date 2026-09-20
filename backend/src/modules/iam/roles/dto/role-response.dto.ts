import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from '@/common/types/role-scope.enum';
import { Role } from '@/modules/iam/roles/entities/role.entity';

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ enum: RoleScope, description: 'A quién sirve el rol.' })
  scope!: RoleScope;

  @ApiProperty({
    required: false,
    description: 'Permisos asignados (en el listado).',
  })
  permissionCount?: number;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'IDs de permisos asignados (en el detalle).',
  })
  permissionIds?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'IDs concedidos siempre a este rol (base del ámbito y blindaje): ' +
      'se muestran marcados y no se pueden desmarcar.',
  })
  lockedPermissionIds?: string[];
}

export interface RoleResponseExtras {
  permissionCount?: number;
  permissionIds?: string[];
  lockedPermissionIds?: string[];
}

export function toRoleResponse(
  role: Role,
  extras: RoleResponseExtras = {},
): RoleResponseDto {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    isSystem: role.isSystem,
    scope: role.scope ?? RoleScope.PLATFORM,
    ...(extras.permissionCount !== undefined && {
      permissionCount: extras.permissionCount,
    }),
    ...(extras.permissionIds && { permissionIds: extras.permissionIds }),
    ...(extras.lockedPermissionIds && {
      lockedPermissionIds: extras.lockedPermissionIds,
    }),
  };
}
