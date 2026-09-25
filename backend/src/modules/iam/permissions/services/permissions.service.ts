import { Inject, Injectable } from '@nestjs/common';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { lockedPermissionCodes } from '@/modules/iam/permissions/catalogs/permission-catalog';
import {
  ROLE_PERMISSION_REPOSITORY,
  type IRolePermissionRepository,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import {
  ROLE_SCOPE_REPOSITORY,
  type IRoleScopeRepository,
} from '@/modules/iam/permissions/repositories/role-scope.repository.interface';

/**
 * Resuelve los permisos efectivos de un conjunto de roles. Cachea el mapa
 * `roleId → Set<permissionCode>` en memoria; se invalida al mutar asignaciones.
 *
 * Los permisos efectivos son **la unión de dos fuentes**:
 *
 * 1. `role_permissions` — lo que un administrador marca en `/admin/roles`.
 * 2. La base del ámbito del rol (`SCOPE_BASELINE`), concedida por código.
 *
 * La segunda existe porque hay permisos que no son una decisión: sin
 * `catalogs.read` ni `account.profile_manage` una cuenta no puede ni moverse, y
 * el aspirante entero vive ahí — su rol no se administra, así que postular o
 * subir un CV no puede depender de una fila en la BD ni de que alguien haya
 * corrido `pnpm seed` en ese entorno.
 *
 * **Un rol de empresa nunca supera al rol EMPLOYER.** Sus permisos se
 * intersecan con los de EMPLOYER al calcularse: si mañana el back-office le
 * quita un permiso a EMPLOYER, desaparece también de todos los roles que las
 * empresas crearon, sin tener que tocar sus filas. La validación al guardar
 * el rol impide lo mismo por delante; esto lo garantiza por detrás.
 */
@Injectable()
export class PermissionsService {
  private cache: Map<string, Set<string>> | null = null;

  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    @Inject(ROLE_SCOPE_REPOSITORY)
    private readonly roleScopes: IRoleScopeRepository,
  ) {}

  invalidate(): void {
    this.cache = null;
  }

  private async load(): Promise<Map<string, Set<string>>> {
    if (!this.cache) {
      const [rows, roles] = await Promise.all([
        this.rolePermissions.findRolePermissionCodes(),
        this.roleScopes.findAll(),
      ]);

      const map = new Map<string, Set<string>>();
      // La base va primero: así un rol sin ninguna fila en `role_permissions`
      // (recién creado) entra igualmente en el mapa y funciona.
      for (const role of roles) {
        map.set(
          role.id,
          lockedPermissionCodes(role.scope, role.code, role.isSystem),
        );
      }
      for (const { roleId, code } of rows) {
        const set = map.get(roleId) ?? new Set<string>();
        set.add(code);
        map.set(roleId, set);
      }

      const employer = roles.find(
        (role) =>
          role.code === (PlatformRole.EMPLOYER as string) && !role.companyId,
      );
      const ceiling = employer ? map.get(employer.id) : undefined;
      for (const role of roles) {
        if (!role.companyId) continue;
        const own = map.get(role.id) ?? new Set<string>();
        // Sin EMPLOYER sembrado no hay techo contra el que medir: el rol de
        // empresa se queda sólo con la base del ámbito, nunca con más.
        const capped = new Set(
          [...own].filter((code) => ceiling?.has(code) ?? false),
        );
        for (const code of lockedPermissionCodes(
          role.scope,
          role.code,
          false,
        )) {
          capped.add(code);
        }
        map.set(role.id, capped);
      }
      this.cache = map;
    }
    return this.cache;
  }

  async permissionsForRoles(roleIds: readonly string[]): Promise<Set<string>> {
    const map = await this.load();
    const granted = new Set<string>();
    for (const roleId of roleIds) {
      const set = map.get(roleId);
      if (set) {
        for (const code of set) granted.add(code);
      }
    }
    return granted;
  }

  async hasPermissions(
    roleIds: readonly string[],
    required: readonly string[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const granted = await this.permissionsForRoles(roleIds);
    return required.every((code) => granted.has(code));
  }
}
