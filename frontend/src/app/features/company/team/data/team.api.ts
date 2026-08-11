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
} from '@/features/company/team/models/team.models';

/**
 * Equipo de la propia empresa. A diferencia del back-office, la empresa **no**
 * viaja en la URL: el backend la resuelve de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class TeamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/members`;

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

  updateRole(
    userId: string,
    role: CompanyMemberRole,
  ): Observable<CompanyMember> {
    return this.http
      .patch<ApiSuccessResponse<CompanyMember>>(`${this.base}/${userId}`, {
        role,
      })
      .pipe(map((r) => r.content));
  }

  remove(userId: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/${userId}`)
      .pipe(map(() => undefined));
  }
}
