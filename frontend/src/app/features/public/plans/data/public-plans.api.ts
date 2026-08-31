import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { ApiPlan } from '@/features/public/plans/models/plans.models';

/** Catálogo público de planes: los que el admin publicó como activos. */
@Injectable({ providedIn: 'root' })
export class PublicPlansApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/plans`;

  list(): Observable<ApiPlan[]> {
    return this.http
      .get<ApiSuccessResponse<ApiPlan[]>>(this.base)
      .pipe(map((r) => r.content));
  }
}
