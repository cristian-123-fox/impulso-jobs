import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  Notification,
  PaginatedNotifications,
  UnreadCount,
} from '@/shared/notifications/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;

  list(page = 1, limit = 20, onlyUnread = false): Observable<PaginatedNotifications> {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (onlyUnread) params['onlyUnread'] = 'true';

    return this.http
      .get<ApiSuccessResponse<PaginatedNotifications>>(this.base, { params })
      .pipe(map((r) => r.content));
  }

  unreadCount(): Observable<UnreadCount> {
    return this.http
      .get<ApiSuccessResponse<UnreadCount>>(`${this.base}/unread-count`)
      .pipe(map((r) => r.content));
  }

  markAsRead(id: string): Observable<void> {
    return this.http
      .patch<ApiSuccessResponse<unknown>>(`${this.base}/${id}/read`, {})
      .pipe(map(() => undefined));
  }

  markAllAsRead(): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<unknown>>(`${this.base}/read-all`, {})
      .pipe(map(() => undefined));
  }
}
