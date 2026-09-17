import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AddCompanyMemberPayload,
  AdminCompany,
  AssignSubscriptionPayload,
  CompaniesFilters,
  CompaniesPage,
  CompanyMember,
  CompanyMemberRole,
  CompanySubscriptionDetail,
  CreateCompanyPayload,
  CreateCompanyResult,
  UpdateCompanyPayload,
  UpdateSubscriptionPayload,
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
    if (filters.sortBy) {
      params = params
        .set('sortBy', filters.sortBy)
        .set('sortOrder', filters.sortOrder ?? 'ASC');
    }

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

  // -------------------------------------------------------------- plan (T34)
  /**
   * El plan vive en `billing`, no en `companies`, aunque la ruta cuelgue de
   * `/admin/companies/:id`: billing ya depende de companies y al revés sería
   * un ciclo. Para el cliente HTTP es la misma URL.
   */
  getSubscription(
    companyId: string,
  ): Observable<CompanySubscriptionDetail | null> {
    return this.http
      .get<
        ApiSuccessResponse<CompanySubscriptionDetail | null>
      >(`${this.base}/${companyId}/subscription`)
      .pipe(map((r) => r.content));
  }

  /** Asigna el plan, o lo cambia si la empresa ya tenía uno. */
  assignSubscription(
    companyId: string,
    payload: AssignSubscriptionPayload,
  ): Observable<CompanySubscriptionDetail> {
    return this.http
      .post<
        ApiSuccessResponse<CompanySubscriptionDetail>
      >(`${this.base}/${companyId}/subscription`, payload)
      .pipe(map((r) => r.content));
  }

  updateSubscription(
    companyId: string,
    payload: UpdateSubscriptionPayload,
  ): Observable<CompanySubscriptionDetail> {
    return this.http
      .patch<
        ApiSuccessResponse<CompanySubscriptionDetail>
      >(`${this.base}/${companyId}/subscription`, payload)
      .pipe(map((r) => r.content));
  }

  /** El motivo es obligatorio, así que el DELETE lleva cuerpo. */
  revokeSubscription(companyId: string, reason: string): Observable<void> {
    return this.http
      .delete<
        ApiSuccessResponse<unknown>
      >(`${this.base}/${companyId}/subscription`, { body: { reason } })
      .pipe(map(() => undefined));
  }

  // ----------------------------------------------------------------- logo
  uploadLogo(
    companyId: string,
    file: File,
  ): Observable<{ logoUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<
        ApiSuccessResponse<{ logoUrl: string | null }>
      >(`${this.base}/${companyId}/logo`, formData)
      .pipe(map((r) => r.content));
  }
}
