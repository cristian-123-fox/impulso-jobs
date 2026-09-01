import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  ApplicationAnswerPayload,
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

  apply(
    vacancyId: string,
    options?: { resumeId?: string; answers?: ApplicationAnswerPayload[] },
  ): Observable<CandidateApplication> {
    return this.http
      .post<ApiSuccessResponse<CandidateApplication>>(this.base, {
        vacancyId,
        ...(options?.resumeId && { resumeId: options.resumeId }),
        ...(options?.answers?.length && { answers: options.answers }),
      })
      .pipe(map((r) => r.content));
  }
}
