import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  PublicVacanciesFilters,
  PublicVacanciesPage,
  PublicVacancy,
  PublicVacancyQuestion,
} from '@/features/public/vacancies/models/public-vacancies.models';

/** Portal de empleo. No requiere sesión: la API es abierta para leer. */
@Injectable({ providedIn: 'root' })
export class PublicVacanciesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/vacancies`;

  list(filters: PublicVacanciesFilters): Observable<PublicVacanciesPage> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.state) params = params.set('state', filters.state);
    if (filters.municipality) {
      params = params.set('municipality', filters.municipality);
    }
    if (filters.employmentType) {
      params = params.set('employmentType', filters.employmentType);
    }
    if (filters.workMode) params = params.set('workMode', filters.workMode);
    if (filters.experienceLevel) {
      params = params.set('experienceLevel', filters.experienceLevel);
    }
    if (filters.areaId) params = params.set('areaId', filters.areaId);
    if (filters.salaryMin) params = params.set('salaryMin', filters.salaryMin);
    if (filters.publishedWithinDays) {
      params = params.set('publishedWithinDays', filters.publishedWithinDays);
    }
    if (filters.sort) params = params.set('sort', filters.sort);

    return this.http
      .get<ApiSuccessResponse<PublicVacanciesPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  get(id: string): Observable<PublicVacancy> {
    return this.http
      .get<ApiSuccessResponse<PublicVacancy>>(`${this.base}/${id}`)
      .pipe(map((r) => r.content));
  }

  getQuestions(id: string): Observable<PublicVacancyQuestion[]> {
    return this.http
      .get<ApiSuccessResponse<PublicVacancyQuestion[]>>(
        `${this.base}/${id}/questions`,
      )
      .pipe(map((r) => r.content));
  }

  /** Denuncia (requiere sesión de candidato; el interceptor adjunta el token). */
  report(
    id: string,
    reasonCode: string,
    comment?: string,
  ): Observable<unknown> {
    return this.http.post<ApiSuccessResponse<unknown>>(
      `${this.base}/${id}/report`,
      { reasonCode, ...(comment && { comment }) },
    );
  }
}
