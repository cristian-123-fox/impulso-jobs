import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CandidateSettings,
  CandidateSettingsPayload,
} from '@/features/panel/models/candidate-settings.models';

@Injectable({ providedIn: 'root' })
export class CandidateSettingsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate/profile-settings`;

  get(): Observable<CandidateSettings> {
    return this.http
      .get<ApiSuccessResponse<CandidateSettings>>(this.base)
      .pipe(map((response) => response.content));
  }

  update(payload: CandidateSettingsPayload): Observable<CandidateSettings> {
    return this.http
      .put<ApiSuccessResponse<CandidateSettings>>(this.base, payload)
      .pipe(map((response) => response.content));
  }
}
