import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CandidateApplication,
  CandidateApplicationsPage,
} from '@/features/candidate/models/candidate-applications.models';

@Injectable({ providedIn: 'root' })
export class CandidateApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate/applications`;

  list(page: number, limit = 10, status?: string): Observable<CandidateApplicationsPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiSuccessResponse<CandidateApplicationsPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  apply(vacancyId: string, resumeId?: string): Observable<CandidateApplication> {
    return this.http
      .post<ApiSuccessResponse<CandidateApplication>>(this.base, {
        vacancyId,
        ...(resumeId && { resumeId }),
      })
      .pipe(map((r) => r.content));
  }
}
