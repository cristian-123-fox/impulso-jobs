import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AccountProfile,
  ChangePasswordPayload,
  UpdateAccountProfilePayload,
} from '@/features/account/models/account.models';

/**
 * `/account/**`: la propia cuenta. Los endpoints no llevan id — el backend
 * resuelve el titular desde el token —, así que este servicio sirve igual a
 * las tres áreas (admin, empresa y candidato).
 */
@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/account`;

  profile(): Observable<AccountProfile> {
    return this.http
      .get<ApiSuccessResponse<AccountProfile>>(`${this.base}/profile`)
      .pipe(map((response) => response.content));
  }

  update(payload: UpdateAccountProfilePayload): Observable<AccountProfile> {
    return this.http
      .put<ApiSuccessResponse<AccountProfile>>(`${this.base}/profile`, payload)
      .pipe(map((response) => response.content));
  }

  /**
   * ⚠️ Al resolverse, el token de esta sesión ya no vale: el backend mueve
   * `tokensValidFrom`. Quien la llame debe cerrar sesión acto seguido, o la
   * siguiente petición dará 401 sin explicación.
   */
  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.base}/password`, payload);
  }

  uploadPhoto(file: File): Observable<{ photoUrl: string | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiSuccessResponse<{ photoUrl: string | null }>>(
        `${this.base}/photo`,
        formData,
      )
      .pipe(map((response) => response.content));
  }

  removePhoto(): Observable<void> {
    return this.http.delete<void>(`${this.base}/photo`);
  }
}
