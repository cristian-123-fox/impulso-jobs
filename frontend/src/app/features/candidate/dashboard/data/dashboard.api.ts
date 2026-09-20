import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { CandidateDashboard } from '@/features/candidate/dashboard/models/dashboard.models';

/** Métricas del panel del aspirante (una sola llamada). */
@Injectable({ providedIn: 'root' })
export class CandidateDashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate`;

  get(days: number): Observable<CandidateDashboard> {
    const params = new HttpParams().set('days', days);
    return this.http
      .get<ApiSuccessResponse<CandidateDashboard>>(`${this.base}/dashboard`, {
        params,
      })
      .pipe(map((r) => r.content));
  }
}
