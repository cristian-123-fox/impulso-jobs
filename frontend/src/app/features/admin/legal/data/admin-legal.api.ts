import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AdminConsentsPage,
  AdminConsentsQuery,
} from '@/features/admin/legal/models/legal-consents.models';

/**
 * Cliente HTTP del back-office de consentimientos.
 *
 * **Sólo expone `list`.** No hay `update`, `delete` ni `withdraw` a propósito:
 * `legal_consents` es una bitácora *append-only* y el back-office no es la
 * excepción. Una revocación la hace la persona desde su cuenta
 * (`POST /legal/consents/withdraw`), que inserta una fila nueva.
 *
 * Que no exista ningún método de escritura aquí no es casualidad: si alguien lo
 * añadiera, el backend devolvería 404 igual. Está para que la intención se lea
 * en el código.
 */
@Injectable({ providedIn: 'root' })
export class AdminLegalApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/legal-consents`;

  list(query: AdminConsentsQuery): Observable<AdminConsentsPage> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    if (query.search) params = params.set('search', query.search);
    if (query.documentCode) {
      params = params.set('documentCode', query.documentCode);
    }
    // `granted` se manda sólo cuando el filtro está activo: `?granted=false` y
    // `granted` ausente significan cosas distintas, y el primero no es "todos".
    if (query.granted !== undefined) {
      params = params.set('granted', String(query.granted));
    }
    if (query.source) params = params.set('source', query.source);
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
      params = params.set('sortOrder', query.sortOrder ?? 'DESC');
    }

    return this.http
      .get<ApiSuccessResponse<AdminConsentsPage>>(this.base, { params })
      .pipe(map((response) => response.content));
  }
}