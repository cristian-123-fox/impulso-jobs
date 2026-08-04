import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  SaveVacancyPayload,
  VacanciesFilters,
  VacanciesPage,
  Vacancy,
} from '@/features/company/vacancies/models/vacancies.models';

/** Cliente HTTP de las vacantes de la empresa (desenvuelve el envelope). */
@Injectable({ providedIn: 'root' })
export class VacanciesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/company/vacancies`;

  list(filters: VacanciesFilters): Observable<VacanciesPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);

    return this.http
      .get<ApiSuccessResponse<VacanciesPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  get(id: string): Observable<Vacancy> {
    return this.http
      .get<ApiSuccessResponse<Vacancy>>(`${this.base}/${id}`)
      .pipe(map((r) => r.content));
  }

  create(payload: SaveVacancyPayload): Observable<Vacancy> {
    return this.http
      .post<ApiSuccessResponse<Vacancy>>(this.base, payload)
      .pipe(map((r) => r.content));
  }

  update(id: string, payload: SaveVacancyPayload): Observable<Vacancy> {
    return this.http
      .put<ApiSuccessResponse<Vacancy>>(`${this.base}/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  pause(id: string): Observable<Vacancy> {
    return this.patch(`${id}/pause`);
  }

  /** El título sólo viaja si el plan permite editarlo al reactivar. */
  reactivate(id: string, title?: string): Observable<Vacancy> {
    return this.patch(`${id}/reactivate`, title ? { title } : {});
  }

  refresh(id: string): Observable<Vacancy> {
    return this.patch(`${id}/refresh`);
  }

  close(id: string): Observable<Vacancy> {
    return this.patch(`${id}/status`, { status: 'CLOSED' });
  }

  private patch(path: string, body: unknown = {}): Observable<Vacancy> {
    return this.http
      .patch<ApiSuccessResponse<Vacancy>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.content));
  }
}
