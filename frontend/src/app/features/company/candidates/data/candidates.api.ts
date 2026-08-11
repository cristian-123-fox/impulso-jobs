import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CandidateDetail,
  CandidatesFilters,
  CandidatesPage,
  TalentQuota,
} from '@/features/company/candidates/models/candidates.models';

/** Banco de talento (M13). Buscar es gratis; abrir una ficha puede costar cupo. */
@Injectable({ providedIn: 'root' })
export class CandidatesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/candidates`;

  search(filters: CandidatesFilters): Observable<CandidatesPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.state) params = params.set('state', filters.state);
    if (filters.municipality) {
      params = params.set('municipality', filters.municipality);
    }
    if (filters.skill) params = params.set('skill', filters.skill);
    if (filters.immediatelyAvailable) {
      params = params.set('immediatelyAvailable', true);
    }

    return this.http
      .get<ApiSuccessResponse<CandidatesPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  quota(): Observable<TalentQuota> {
    return this.http
      .get<ApiSuccessResponse<TalentQuota>>(`${this.base}/quota`)
      .pipe(map((r) => r.content));
  }

  /** Consume una visita si el perfil viene del banco y no estaba desbloqueado. */
  get(id: string): Observable<CandidateDetail> {
    return this.http
      .get<ApiSuccessResponse<CandidateDetail>>(`${this.base}/${id}`)
      .pipe(map((r) => r.content));
  }
}
