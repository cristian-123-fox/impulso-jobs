import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  VacancyReport,
  VacancyReportsPage,
} from '@/features/admin/reports/models/reports.models';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/vacancy-reports`;

  list(page: number, limit = 10, status?: string): Observable<VacancyReportsPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiSuccessResponse<VacancyReportsPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  resolve(id: string): Observable<VacancyReport> {
    return this.http
      .patch<ApiSuccessResponse<VacancyReport>>(`${this.base}/${id}/resolve`, {})
      .pipe(map((r) => r.content));
  }
}
