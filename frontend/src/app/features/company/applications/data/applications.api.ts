import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  ApplicationStatus,
  ApplicationStatusHistory,
  ApplicationsFilters,
  ApplicationsPage,
  CompanyApplication,
} from '@/features/company/applications/models/applications.models';

/** Postulaciones a las vacantes de la propia empresa (M11). */
@Injectable({ providedIn: 'root' })
export class ApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/applications`;

  list(filters: ApplicationsFilters): Observable<ApplicationsPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.vacancyId) params = params.set('vacancyId', filters.vacancyId);
    if (filters.status) params = params.set('status', filters.status);

    return this.http
      .get<ApiSuccessResponse<ApplicationsPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  /** Catálogo de estados para el selector. */
  listStatuses(): Observable<ApplicationStatus[]> {
    return this.http
      .get<ApiSuccessResponse<ApplicationStatus[]>>(`${this.base}/statuses`)
      .pipe(map((r) => r.content));
  }

  get(id: string): Observable<CompanyApplication> {
    return this.http
      .get<ApiSuccessResponse<CompanyApplication>>(`${this.base}/${id}`)
      .pipe(map((r) => r.content));
  }

  history(id: string): Observable<ApplicationStatusHistory[]> {
    return this.http
      .get<
        ApiSuccessResponse<ApplicationStatusHistory[]>
      >(`${this.base}/${id}/history`)
      .pipe(map((r) => r.content));
  }

  changeStatus(id: string, status: string): Observable<CompanyApplication> {
    return this.http
      .put<ApiSuccessResponse<CompanyApplication>>(`${this.base}/${id}/status`, {
        status,
      })
      .pipe(map((r) => r.content));
  }
}
