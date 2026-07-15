import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { PermissionResponseDto } from '@/modules/iam/permissions/dto/permission-response.dto';

export function toPermissionResponse(
  permission: Permission,
): PermissionResponseDto {
  return {
    id: permission.id,
    code: permission.code,
    component: permission.code.split('.')[0],
    description: permission.description ?? null,
  };
}
