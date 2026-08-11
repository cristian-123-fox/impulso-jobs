import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { RolesApi } from '@/features/admin/roles/data/roles.api';
import {
  CreateRolePayload,
  Permission,
  RoleSummary,
  UpdateRolePayload,
} from '@/features/admin/roles/models/roles.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Fachada del feature admin/roles: estado con Signals + acciones sobre la API. */
@Injectable()
export class RolesFacade {
  private readonly api = inject(RolesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = signal<RoleSummary[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly rolesState = signal<LoadState>('idle');

  /** Permisos agrupados por componente para la matriz. */
  readonly permissionGroups = computed(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of this.permissions()) {
      const list = groups.get(permission.component) ?? [];
      list.push(permission);
      groups.set(permission.component, list);
    }
    return [...groups.entries()]
      .map(([component, items]) => ({ component, items }))
      .sort((a, b) => a.component.localeCompare(b.component));
  });

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
    if (this.permissions().length > 0) return;
    this.api
      .listPermissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((permissions) => this.permissions.set(permissions));
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
          // El `PUT` no devuelve `isSystem`: se conserva lo que ya teníamos.
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

  assignPermission(roleId: string, permissionId: string): Observable<void> {
    return this.api.assignPermission(roleId, permissionId);
  }

  removePermission(roleId: string, permissionId: string): Observable<void> {
    return this.api.removePermission(roleId, permissionId);
  }
}
