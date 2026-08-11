import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  Plan,
  PlanFeatureCatalogItem,
  PlanFeatureValuePayload,
  SavePlanFeaturePayload,
  SavePlanPayload,
} from '@/features/admin/plans/models/plans.models';

/**
 * Cliente HTTP del back-office del catálogo (`/admin/plans`). Devuelve todos
 * los planes, activos o no — el portal público consume otro endpoint.
 */
@Injectable({ providedIn: 'root' })
export class PlansApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  list(): Observable<Plan[]> {
    return this.http
      .get<ApiSuccessResponse<Plan[]>>(`${this.base}/plans`)
      .pipe(map((r) => r.content));
  }

  get(id: string): Observable<Plan> {
    return this.http
      .get<ApiSuccessResponse<Plan>>(`${this.base}/plans/${id}`)
      .pipe(map((r) => r.content));
  }

  create(payload: SavePlanPayload): Observable<Plan> {
    return this.http
      .post<ApiSuccessResponse<Plan>>(`${this.base}/plans`, payload)
      .pipe(map((r) => r.content));
  }

  update(id: string, payload: SavePlanPayload): Observable<Plan> {
    return this.http
      .put<ApiSuccessResponse<Plan>>(`${this.base}/plans/${id}`, payload)
      .pipe(map((r) => r.content));
  }

  changeStatus(id: string, isActive: boolean): Observable<Plan> {
    return this.http
      .patch<ApiSuccessResponse<Plan>>(`${this.base}/plans/${id}/status`, {
        isActive,
      })
      .pipe(map((r) => r.content));
  }

  /** Reemplaza la matriz completa de beneficios del plan. */
  setFeatures(
    id: string,
    features: PlanFeatureValuePayload[],
  ): Observable<Plan> {
    return this.http
      .put<ApiSuccessResponse<Plan>>(`${this.base}/plans/${id}/features`, {
        features,
      })
      .pipe(map((r) => r.content));
  }

  listFeatures(): Observable<PlanFeatureCatalogItem[]> {
    return this.http
      .get<ApiSuccessResponse<PlanFeatureCatalogItem[]>>(
        `${this.base}/plan-features`,
      )
      .pipe(map((r) => r.content));
  }

  /** Alta y edición del catálogo: el backend hace upsert por `code`. */
  saveFeature(
    payload: SavePlanFeaturePayload,
  ): Observable<PlanFeatureCatalogItem> {
    return this.http
      .post<ApiSuccessResponse<PlanFeatureCatalogItem>>(
        `${this.base}/plan-features`,
        payload,
      )
      .pipe(map((r) => r.content));
  }
}
