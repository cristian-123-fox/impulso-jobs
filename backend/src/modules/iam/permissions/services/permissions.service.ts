import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_PERMISSION_REPOSITORY,
  type IRolePermissionRepository,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';

/**
 * Resuelve los permisos efectivos de un conjunto de roles. Cachea el mapa
 * `roleId → Set<permissionCode>` en memoria; se invalida al mutar asignaciones.
 */
@Injectable()
export class PermissionsService {
  private cache: Map<string, Set<string>> | null = null;

  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
  ) {}

  invalidate(): void {
    this.cache = null;
  }

  private async load(): Promise<Map<string, Set<string>>> {
    if (!this.cache) {
      const rows = await this.rolePermissions.findRolePermissionCodes();
      const map = new Map<string, Set<string>>();
      for (const { roleId, code } of rows) {
        const set = map.get(roleId) ?? new Set<string>();
        set.add(code);
        map.set(roleId, set);
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
