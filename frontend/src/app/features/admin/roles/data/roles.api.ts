import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CreateRolePayload,
  PermissionCatalog,
  RoleSummary,
  UpdateRolePayload,
} from '@/features/admin/roles/models/roles.models';

/** Cliente HTTP de roles/permisos (desenvuelve el envelope). */
@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listRoles(): Observable<RoleSummary[]> {
    return this.http
      .get<ApiSuccessResponse<RoleSummary[]>>(`${this.base}/roles`)
      .pipe(map((r) => r.content));
  }

  getRole(id: string): Observable<RoleSummary> {
    return this.http
      .get<ApiSuccessResponse<RoleSummary>>(`${this.base}/roles/${id}`)
      .pipe(map((r) => r.content));
  }

  createRole(payload: CreateRolePayload): Observable<RoleSummary> {
    return this.http
      .post<ApiSuccessResponse<RoleSummary>>(`${this.base}/roles`, payload)
      .pipe(map((r) => r.content));
  }

  updateRole(id: string, payload: UpdateRolePayload): Observable<RoleSummary> {
    return this.http
      .put<ApiSuccessResponse<RoleSummary>>(`${this.base}/roles/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  /** Sólo roles personalizados y sin cuentas asignadas; si no, el backend 409. */
  deleteRole(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/roles/${id}`)
      .pipe(map(() => undefined));
  }

  /** Catálogo completo: permisos con etiqueta y grupo, grupos y base por ámbito. */
  listPermissions(): Observable<PermissionCatalog> {
    return this.http
      .get<ApiSuccessResponse<PermissionCatalog>>(`${this.base}/permissions`)
      .pipe(map((r) => r.content));
  }

  /**
   * Guarda el árbol entero: viaja el conjunto que queda marcado y el backend
   * calcula altas y bajas. Devuelve los permisos resultantes para resincronizar
   * — los de la base del ámbito nunca se guardan, así que no vuelven aquí.
   */
  replacePermissions(
    roleId: string,
    permissionIds: string[],
  ): Observable<string[]> {
    return this.http
      .put<ApiSuccessResponse<string[]>>(
        `${this.base}/roles/${roleId}/permissions`,
        { permissionIds },
      )
      .pipe(map((r) => r.content));
  }
}
