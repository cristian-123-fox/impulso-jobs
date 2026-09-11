import { Injectable, inject, signal } from '@angular/core';
import { NotificationApi } from '@/shared/notifications/notification.api';
import { Notification } from '@/shared/notifications/notification.models';

/**
 * Estado global de notificaciones. Se usa en los layouts (bell icon)
 * y en la página de notificaciones.
 */
@Injectable({ providedIn: 'root' })
export class NotificationFacade {
  private readonly api = inject(NotificationApi);

  readonly unreadCount = signal(0);
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly hasMore = signal(true);

  /** Carga el conteo de no leídas (polling). */
  refreshUnreadCount(): void {
    this.api.unreadCount().subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => this.unreadCount.set(0),
    });
  }

  /** Carga la primera página de notificaciones. */
  loadNotifications(): void {
    this.loading.set(true);
    this.page.set(1);
    this.api.list(1, 20).subscribe({
      next: (res) => {
        this.notifications.set(res.items);
        this.total.set(res.total);
        this.hasMore.set(res.items.length < res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  /** Carga la siguiente página (append). */
  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    const nextPage = this.page() + 1;
    this.loading.set(true);
    this.api.list(nextPage, 20).subscribe({
      next: (res) => {
        this.notifications.update((prev) => [...prev, ...res.items]);
        this.page.set(nextPage);
        this.total.set(res.total);
        this.hasMore.set(this.notifications().length < res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  /** Marca una notificación como leída y actualiza el conteo. */
  markAsRead(id: string): void {
    this.api.markAsRead(id).subscribe({
      next: () => {
        this.notifications.update((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  /** Marca todas como leídas. */
  markAllAsRead(): void {
    this.api.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
        );
        this.unreadCount.set(0);
      },
    });
  }
}
