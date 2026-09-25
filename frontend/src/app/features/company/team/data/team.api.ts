import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AddCompanyMemberPayload,
  CompanyMember,
  CompanyMemberRole,
  CompanyPermissionCatalog,
  CompanyRole,
  SaveCompanyRolePayload,
} from '@/features/company/team/models/team.models';

/**
 * Equipo de la propia empresa. A diferencia del back-office, la empresa **no**
 * viaja en la URL: el backend la resuelve de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class TeamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/members`;
  private readonly rolesBase = `${environment.apiBaseUrl}/company/roles`;

  list(): Observable<CompanyMember[]> {
    return this.http
      .get<ApiSuccessResponse<CompanyMember[]>>(this.base)
      .pipe(map((r) => r.content));
  }

  add(payload: AddCompanyMemberPayload): Observable<CompanyMember> {
    return this.http
      .post<ApiSuccessResponse<CompanyMember>>(this.base, payload)
      .pipe(map((r) => r.content));
  }

  /** `accessRoleId`: `null` = acceso completo; `undefined` = no se toca. */
  updateRole(
    userId: string,
    role: CompanyMemberRole,
    accessRoleId?: string | null,
  ): Observable<CompanyMember> {
    return this.http
      .patch<ApiSuccessResponse<CompanyMember>>(`${this.base}/${userId}`, {
        role,
        accessRoleId,
      })
      .pipe(map((r) => r.content));
  }

  // ── Roles de la empresa ─────────────────────────────────────────────────

  listRoles(): Observable<CompanyRole[]> {
    return this.http
      .get<ApiSuccessResponse<CompanyRole[]>>(this.rolesBase)
      .pipe(map((r) => r.content));
  }

  permissionCatalog(): Observable<CompanyPermissionCatalog> {
    return this.http
      .get<
        ApiSuccessResponse<CompanyPermissionCatalog>
      >(`${this.rolesBase}/permissions`)
      .pipe(map((r) => r.content));
  }

  createRole(payload: SaveCompanyRolePayload): Observable<CompanyRole> {
    return this.http
      .post<ApiSuccessResponse<CompanyRole>>(this.rolesBase, payload)
      .pipe(map((r) => r.content));
  }

  updateCompanyRole(
    id: string,
    payload: SaveCompanyRolePayload,
  ): Observable<CompanyRole> {
    return this.http
      .put<ApiSuccessResponse<CompanyRole>>(`${this.rolesBase}/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  deleteRole(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.rolesBase}/${id}`)
      .pipe(map(() => undefined));
  }

  remove(userId: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/${userId}`)
      .pipe(map(() => undefined));
  }
}
