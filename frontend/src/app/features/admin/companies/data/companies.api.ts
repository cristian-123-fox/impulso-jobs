import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AdminCompany,
  CompaniesFilters,
  CompaniesPage,
  CreateCompanyPayload,
  CreateCompanyResult,
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
}
