import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { SavedVacanciesPage, SavedVacancyItem } from '@/features/candidate/models/candidate-saved-vacancies.models';

/** Vacantes guardadas del candidato (T17). */
@Injectable({ providedIn: 'root' })
export class CandidateSavedVacanciesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate/saved-vacancies`;

  list(page: number, limit = 10): Observable<SavedVacanciesPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiSuccessResponse<SavedVacanciesPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  /** Ids guardados, para pintar el estado del botón en el portal. */
  ids(): Observable<string[]> {
    return this.http
      .get<ApiSuccessResponse<string[]>>(`${this.base}/ids`)
      .pipe(map((r) => r.content));
  }

  save(vacancyId: string): Observable<SavedVacancyItem> {
    return this.http
      .post<ApiSuccessResponse<SavedVacancyItem>>(
        `${this.base}/${vacancyId}`,
        {},
      )
      .pipe(map((r) => r.content));
  }

  remove(vacancyId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${vacancyId}`);
  }
}
