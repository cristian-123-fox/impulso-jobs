import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CompanyLogoPayload,
  CompanyProfile,
  CompanyProfilePayload,
} from '@/features/panel/models/company-profile.models';

@Injectable({ providedIn: 'root' })
export class CompanyProfileApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/profile`;

  getProfile(): Observable<CompanyProfile> {
    return this.http
      .get<ApiSuccessResponse<CompanyProfile>>(this.base)
      .pipe(map((response) => response.content));
  }

  updateProfile(payload: CompanyProfilePayload): Observable<CompanyProfile> {
    return this.http
      .put<ApiSuccessResponse<CompanyProfile>>(this.base, payload)
      .pipe(map((response) => response.content));
  }

  updateLogo(payload: CompanyLogoPayload): Observable<{ logoUrl: string | null }> {
    return this.http
      .patch<ApiSuccessResponse<{ logoUrl: string | null }>>(
        `${this.base}/logo`,
        payload,
      )
      .pipe(map((response) => response.content));
  }
}
