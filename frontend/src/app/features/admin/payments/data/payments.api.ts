import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AdminPayment,
  AdminPaymentFilter,
  AdminPaymentsPage,
} from '@/features/admin/payments/models/payments.models';
import { IjSortState } from '@/shared/ui';

export interface AdminPaymentsQuery {
  page: number;
  limit: number;
  status?: AdminPaymentFilter;
  sort?: IjSortState | null;
}

/** Cola de cobros del back-office (`/admin/payments`). */
@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/payments`;

  list(query: AdminPaymentsQuery): Observable<AdminPaymentsPage> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);
    if (query.status) params = params.set('status', query.status);
    if (query.sort) {
      params = params
        .set('sortBy', query.sort.column)
        .set('sortOrder', query.sort.order);
    }
    return this.http
      .get<ApiSuccessResponse<AdminPaymentsPage>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  confirm(id: string): Observable<AdminPayment> {
    return this.http
      .post<ApiSuccessResponse<AdminPayment>>(`${this.base}/${id}/confirm`, {})
      .pipe(map((r) => r.content));
  }

  /** Pregunta a Stripe por el estado real (por si no llegó el webhook). */
  sync(id: string): Observable<AdminPayment> {
    return this.http
      .post<ApiSuccessResponse<AdminPayment>>(`${this.base}/${id}/sync`, {})
      .pipe(map((r) => r.content));
  }

  reject(id: string, reason?: string): Observable<AdminPayment> {
    return this.http
      .post<ApiSuccessResponse<AdminPayment>>(`${this.base}/${id}/reject`, {
        reason: reason || undefined,
      })
      .pipe(map((r) => r.content));
  }
}
