import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { IjIcon } from '@/shared/ui/icon/icon';
import { NotificationFacade } from '@/shared/notifications/notification.facade';
import { Notification } from '@/shared/notifications/notification.models';

/**
 * Página de notificaciones reutilizable. Se usa en candidato, empresa y admin.
 * Lista completa con paginación y mark-as-read.
 */
@Component({
  selector: 'app-notifications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="mx-auto max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-xl font-bold text-ink-900">Notificaciones</h1>
        @if (facade.unreadCount() > 0) {
          <button
            type="button"
            class="text-[13px] font-semibold text-brand hover:underline"
            (click)="markAllRead()"
          >
            Marcar todo como leído
          </button>
        }
      </div>

      @if (facade.loading() && facade.notifications().length === 0) {
        <div class="py-12 text-center text-[13px] text-muted">Cargando...</div>
      } @else if (facade.notifications().length === 0) {
        <div class="rounded-xl border border-line bg-white px-6 py-12 text-center">
          <ij-icon name="bell" [size]="32" [strokeWidth]="1.5" class="mx-auto mb-3 text-muted" />
          <p class="text-[14px] text-muted">No tienes notificaciones.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (n of facade.notifications(); track n.id) {
            <button
              type="button"
              class="w-full rounded-xl border border-line bg-white px-5 py-4 text-left transition-colors hover:border-brand-50 hover:bg-brand-50"
              [class.border-l-4]="!n.readAt"
              [class.border-l-brand]="!n.readAt"
              (click)="onNotificationClick(n)"
            >
              <div class="flex items-start gap-3">
                @if (!n.readAt) {
                  <span class="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand"></span>
                }
                <div class="min-w-0 flex-1">
                  <div class="text-[14px] font-semibold text-ink-900">
                    {{ n.title }}
                  </div>
                  <div class="mt-1 text-[13px] text-body">
                    {{ n.body }}
                  </div>
                  <div class="mt-2 text-[12px] text-muted">
                    {{ formatDate(n.createdAt) }}
                  </div>
                </div>
              </div>
            </button>
          }
        </div>

        @if (facade.hasMore()) {
          <div class="mt-4 text-center">
            <button
              type="button"
              class="rounded-xl border border-line px-6 py-2.5 text-[13px] font-semibold text-body transition-colors hover:bg-surface"
              [disabled]="facade.loading()"
              (click)="loadMore()"
            >
              {{ facade.loading() ? 'Cargando...' : 'Cargar más' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class NotificationsPage implements OnInit {
  readonly facade = inject(NotificationFacade);

  ngOnInit(): void {
    this.facade.loadNotifications();
  }

  markAllRead(): void {
    this.facade.markAllAsRead();
  }

  loadMore(): void {
    this.facade.loadMore();
  }

  onNotificationClick(notification: Notification): void {
    this.facade.markAsRead(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Hace ${diffD}d`;
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
