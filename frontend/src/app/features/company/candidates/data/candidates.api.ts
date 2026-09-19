import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CandidateDetail,
  CandidateResumeDownload,
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
    if (filters.country) params = params.set('country', filters.country);
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

  /**
   * Fichero de un CV del candidato (T30). No descuenta cupo: la visita ya se
   * cobró al abrir la ficha, que es de donde sale el `resumeId`.
   */
  resume(id: string, resumeId: string): Observable<CandidateResumeDownload> {
    return this.http
      .get(`${this.base}/${id}/resumes/${resumeId}`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response) => this.toDownload(response)));
  }

  private toDownload(response: HttpResponse<Blob>): CandidateResumeDownload {
    const disposition = response.headers.get('content-disposition') ?? '';
    const encodedName =
      disposition.match(/filename="([^"]+)"/i)?.[1] ?? 'hoja-de-vida.pdf';

    return {
      blob: response.body ?? new Blob(),
      fileName: decodeURIComponent(encodedName),
    };
  }
}
