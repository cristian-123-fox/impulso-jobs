import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { AdminDashboard } from '@/features/admin/dashboard/models/dashboard.models';

/** Métricas del panel del back-office (una sola llamada). */
@Injectable({ providedIn: 'root' })
export class AdminDashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  get(days: number): Observable<AdminDashboard> {
    const params = new HttpParams().set('days', days);
    return this.http
      .get<ApiSuccessResponse<AdminDashboard>>(`${this.base}/dashboard`, {
        params,
      })
      .pipe(map((r) => r.content));
  }
}
