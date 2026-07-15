import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({
    type: [String],
    required: false,
    description: 'IDs de permisos (en el detalle).',
  })
  permissionIds?: string[];
}

export function toRoleResponse(
  role: Role,
  permissionIds?: string[],
): RoleResponseDto {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    isSystem: role.isSystem,
    ...(permissionIds && { permissionIds }),
  };
}
