import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { RolesApi } from '@/features/admin/roles/data/roles.api';
import type { PermissionTreeGroup } from '@/shared/permissions/permission-tree';
import {
  ADMINISTRABLE_SCOPES,
  CreateRolePayload,
  PermissionCatalog,
  RoleScope,
  RoleSummary,
  UpdateRolePayload,
} from '@/features/admin/roles/models/roles.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** El árbol vive en `shared/permissions`; se reexporta por compatibilidad. */
export type { PermissionTreeGroup };

/** Fachada del feature admin/roles: estado con Signals + acciones sobre la API. */
@Injectable()
export class RolesFacade {
  private readonly api = inject(RolesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = signal<RoleSummary[]>([]);
  readonly catalog = signal<PermissionCatalog | null>(null);
  readonly rolesState = signal<LoadState>('idle');

  /**
   * Sólo los roles que se administran. El del aspirante existe en la API pero
   * sus permisos son fijos, así que enseñarlo sería ofrecer algo que no se
   * puede hacer.
   */
  readonly administrableRoles = computed(() =>
    this.roles().filter((role) => ADMINISTRABLE_SCOPES.includes(role.scope)),
  );

  rolesOfScope(scope: RoleScope): RoleSummary[] {
    return this.administrableRoles().filter((role) => role.scope === scope);
  }

  /**
   * Árbol de permisos de un ámbito: los grupos del catálogo, en su orden, con
   * los permisos que aplican a ese ámbito. Un grupo sin permisos aplicables no
   * aparece — un rol de empresa no tiene por qué ver «Usuarios y cuentas».
   */
  permissionTree(scope: RoleScope): PermissionTreeGroup[] {
    const catalog = this.catalog();
    if (!catalog) return [];
    return catalog.groups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        group,
        items: catalog.permissions.filter(
          (permission) =>
            permission.group === group.key && permission.scopes.includes(scope),
        ),
      }))
      .filter((node) => node.items.length > 0);
  }

  loadRoles(): void {
    this.rolesState.set('loading');
    this.api
      .listRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.rolesState.set('loaded');
        },
        error: () => this.rolesState.set('error'),
      });
  }

  loadPermissions(): void {
    if (this.catalog()) return;
    this.api
      .listPermissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((catalog) => this.catalog.set(catalog));
  }

  getRole(id: string): Observable<RoleSummary> {
    return this.api.getRole(id);
  }

  createRole(payload: CreateRolePayload): Observable<RoleSummary> {
    return this.api
      .createRole(payload)
      .pipe(tap((role) => this.roles.update((list) => [...list, role])));
  }

  updateRole(id: string, payload: UpdateRolePayload): Observable<RoleSummary> {
    return this.api.updateRole(id, payload).pipe(
      tap((updated) =>
        this.roles.update((list) =>
          // El `PUT` no devuelve el contador de permisos: se conserva el que
          // ya teníamos del listado.
          list.map((role) =>
            role.id === updated.id ? { ...role, ...updated } : role,
          ),
        ),
      ),
    );
  }

  deleteRole(id: string): Observable<void> {
    return this.api
      .deleteRole(id)
      .pipe(
        tap(() =>
          this.roles.update((list) => list.filter((role) => role.id !== id)),
        ),
      );
  }

  /** Guarda el árbol completo y refresca el contador del listado. */
  replacePermissions(
    roleId: string,
    permissionIds: string[],
  ): Observable<string[]> {
    return this.api.replacePermissions(roleId, permissionIds).pipe(
      tap((saved) =>
        this.roles.update((list) =>
          list.map((role) =>
            role.id === roleId
              ? { ...role, permissionCount: saved.length }
              : role,
          ),
        ),
      ),
    );
  }
}
