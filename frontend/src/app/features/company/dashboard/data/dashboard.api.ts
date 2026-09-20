import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { CompanyDashboard } from '@/features/company/dashboard/models/dashboard.models';

/** Métricas del panel de inicio de la empresa (una sola llamada). */
@Injectable({ providedIn: 'root' })
export class CompanyDashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company`;

  get(days: number): Observable<CompanyDashboard> {
    const params = new HttpParams().set('days', days);
    return this.http
      .get<ApiSuccessResponse<CompanyDashboard>>(`${this.base}/dashboard`, {
        params,
      })
      .pipe(map((r) => r.content));
  }
}
