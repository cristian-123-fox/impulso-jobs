import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  CandidateResume,
  CandidateResumeDownload,
} from '@/features/panel/models/candidate-resume.models';

@Injectable({ providedIn: 'root' })
export class CandidateResumeApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate/resumes`;

  list(): Observable<CandidateResume[]> {
    return this.http
      .get<ApiSuccessResponse<CandidateResume[]>>(this.base)
      .pipe(map((response) => response.content));
  }

  upload(file: File): Observable<CandidateResume> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiSuccessResponse<CandidateResume>>(this.base, formData)
      .pipe(map((response) => response.content));
  }

  select(id: string): Observable<CandidateResume> {
    return this.http
      .patch<ApiSuccessResponse<CandidateResume>>(`${this.base}/${id}/select`, {})
      .pipe(map((response) => response.content));
  }

  download(id: string): Observable<CandidateResumeDownload> {
    return this.http
      .get(`${this.base}/${id}/download`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response) => this.toDownload(response)));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  private toDownload(response: HttpResponse<Blob>): CandidateResumeDownload {
    const fallback = 'hoja-de-vida.pdf';
    const disposition = response.headers.get('content-disposition') ?? '';
    const encodedName = disposition.match(/filename="([^"]+)"/i)?.[1] ?? fallback;

    return {
      blob: response.body ?? new Blob(),
      fileName: decodeURIComponent(encodedName),
    };
  }
}
