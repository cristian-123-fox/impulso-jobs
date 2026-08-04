import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserStatus,
  UsersFilters,
  UsersPage,
} from '@/features/admin/users/models/users.models';

/** Cliente HTTP del back-office de usuarios (desenvuelve el envelope). */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/users`;

  list(filters: UsersFilters): Observable<UsersPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.status) params = params.set('status', filters.status);

    return this.http
      .get<ApiSuccessResponse<UsersPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  create(payload: CreateUserPayload): Observable<AdminUser> {
    return this.http
      .post<ApiSuccessResponse<AdminUser>>(this.base, payload)
      .pipe(map((r) => r.content));
  }

  update(id: string, payload: UpdateUserPayload): Observable<AdminUser> {
    return this.http
      .put<ApiSuccessResponse<AdminUser>>(`${this.base}/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  /** Fija el conjunto completo de roles adicionales (personalizados). */
  setRoles(id: string, roleIds: string[]): Observable<AdminUser> {
    return this.http
      .put<ApiSuccessResponse<AdminUser>>(`${this.base}/${id}/roles`, {
        roleIds,
      })
      .pipe(map((r) => r.content));
  }

  updateStatus(id: string, status: UserStatus): Observable<AdminUser> {
    return this.http
      .patch<ApiSuccessResponse<AdminUser>>(`${this.base}/${id}/status`, {
        status,
      })
      .pipe(map((r) => r.content));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
