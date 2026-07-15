import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CreateRolePayload,
  Permission,
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

  listPermissions(): Observable<Permission[]> {
    return this.http
      .get<ApiSuccessResponse<Permission[]>>(`${this.base}/permissions`)
      .pipe(map((r) => r.content));
  }

  assignPermission(roleId: string, permissionId: string): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<unknown>>(`${this.base}/roles/${roleId}/permissions`, {
        permissionId,
      })
      .pipe(map(() => undefined));
  }

  removePermission(roleId: string, permissionId: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(
        `${this.base}/roles/${roleId}/permissions/${permissionId}`,
      )
      .pipe(map(() => undefined));
  }
}
