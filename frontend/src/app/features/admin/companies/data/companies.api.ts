import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AddCompanyMemberPayload,
  AdminCompany,
  CompaniesFilters,
  CompaniesPage,
  CompanyMember,
  CompanyMemberRole,
  CreateCompanyPayload,
  CreateCompanyResult,
  UpdateCompanyPayload,
} from '@/features/admin/companies/models/companies.models';

/** Cliente HTTP del back-office de empresas (desenvuelve el envelope). */
@Injectable({ providedIn: 'root' })
export class CompaniesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/companies`;

  list(filters: CompaniesFilters): Observable<CompaniesPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.state) params = params.set('state', filters.state);

    return this.http
      .get<ApiSuccessResponse<CompaniesPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  get(id: string): Observable<AdminCompany> {
    return this.http
      .get<ApiSuccessResponse<AdminCompany>>(`${this.base}/${id}`)
      .pipe(map((r) => r.content));
  }

  create(payload: CreateCompanyPayload): Observable<CreateCompanyResult> {
    return this.http
      .post<ApiSuccessResponse<CreateCompanyResult>>(this.base, payload)
      .pipe(map((r) => r.content));
  }

  update(id: string, payload: UpdateCompanyPayload): Observable<AdminCompany> {
    return this.http
      .put<ApiSuccessResponse<AdminCompany>>(`${this.base}/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  // ------------------------------------------------------------------ equipo
  listMembers(companyId: string): Observable<CompanyMember[]> {
    return this.http
      .get<
        ApiSuccessResponse<CompanyMember[]>
      >(`${this.base}/${companyId}/members`)
      .pipe(map((r) => r.content));
  }

  addMember(
    companyId: string,
    payload: AddCompanyMemberPayload,
  ): Observable<CompanyMember> {
    return this.http
      .post<
        ApiSuccessResponse<CompanyMember>
      >(`${this.base}/${companyId}/members`, payload)
      .pipe(map((r) => r.content));
  }

  updateMemberRole(
    companyId: string,
    userId: string,
    role: CompanyMemberRole,
  ): Observable<CompanyMember> {
    return this.http
      .patch<
        ApiSuccessResponse<CompanyMember>
      >(`${this.base}/${companyId}/members/${userId}`, { role })
      .pipe(map((r) => r.content));
  }

  removeMember(companyId: string, userId: string): Observable<void> {
    return this.http
      .delete<
        ApiSuccessResponse<unknown>
      >(`${this.base}/${companyId}/members/${userId}`)
      .pipe(map(() => undefined));
  }
}
