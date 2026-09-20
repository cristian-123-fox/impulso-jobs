import { RoleScope } from '@/common/types/role-scope.enum';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import {
  PERMISSION_GROUPS,
  SCOPE_BASELINE,
  permissionMeta,
} from '@/modules/iam/permissions/catalogs/permission-catalog';
import {
  PermissionCatalogResponseDto,
  PermissionResponseDto,
} from '@/modules/iam/permissions/dto/permission-response.dto';

export function toPermissionResponse(
  permission: Permission,
): PermissionResponseDto {
  const meta = permissionMeta(permission.code);
  return {
    id: permission.id,
    code: permission.code,
    component: permission.code.split('.')[0],
    // La descripción del catálogo manda sobre la de la BD: la fila la escribió
    // el seed en formato «Acción · Componente», que no dice nada al usuario.
    description: meta.description || (permission.description ?? null),
    label: meta.label,
    group: meta.group,
    scopes: [...meta.scopes],
  };
}

/** Listado + grupos + base por ámbito, tal como lo consume el árbol. */
export function toPermissionCatalogResponse(
  permissions: readonly Permission[],
): PermissionCatalogResponseDto {
  const mapped = permissions.map(toPermissionResponse);
  const used = new Set(mapped.map((permission) => permission.group));
  return {
    permissions: mapped,
    // Sólo los grupos con permisos: `other` no debe aparecer si nadie cae ahí.
    groups: PERMISSION_GROUPS.filter((group) => used.has(group.key)).map(
      (group) => ({ ...group }),
    ),
    baseline: {
      [RoleScope.PLATFORM]: [...SCOPE_BASELINE[RoleScope.PLATFORM]],
      [RoleScope.COMPANY]: [...SCOPE_BASELINE[RoleScope.COMPANY]],
      [RoleScope.CANDIDATE]: [...SCOPE_BASELINE[RoleScope.CANDIDATE]],
    },
  };
}
