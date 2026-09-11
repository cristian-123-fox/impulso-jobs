import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IjIcon } from '@/shared/ui/icon/icon';
import { NotificationFacade } from '@/shared/notifications/notification.facade';
import { Notification } from '@/shared/notifications/notification.models';

/**
 * Campana de notificaciones reutilizable. Se inserta en los headers de
 * candidato, empresa y admin. Muestra un badge con el conteo de no leídas
 * y un panel desplegable con las últimas notificaciones.
 *
 * Sin websockets: usa polling al navegar (patrón cPanel).
 */
@Component({
  selector: 'ij-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjIcon],
  template: `
    <div class="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        class="relative flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border border-line bg-surface text-body transition-colors hover:text-brand"
        (click)="togglePanel()"
      >
        <ij-icon name="bell" [size]="19" [strokeWidth]="1.8" />
        @if (facade.unreadCount() > 0) {
          <span
            class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
          >
            {{ facade.unreadCount() > 99 ? '99+' : facade.unreadCount() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div
          class="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-line bg-white shadow-float"
        >
          <div class="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 class="text-[13px] font-bold text-ink-900">Notificaciones</h3>
            @if (facade.unreadCount() > 0) {
              <button
                type="button"
                class="text-[12px] font-semibold text-brand hover:underline"
                (click)="markAllRead()"
              >
                Marcar todo como leído
              </button>
            }
          </div>

          <div class="max-h-[400px] overflow-y-auto">
            @if (facade.notifications().length === 0) {
              <div class="px-4 py-8 text-center text-[13px] text-muted">
                No tienes notificaciones.
              </div>
            } @else {
              @for (n of facade.notifications(); track n.id) {
                <button
                  type="button"
                  class="w-full border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface"
                  [class.bg-brand-50]="!n.readAt"
                  (click)="onNotificationClick(n)"
                >
                  <div class="flex items-start gap-3">
                    @if (!n.readAt) {
                      <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand"></span>
                    } @else {
                      <span class="mt-1 h-2 w-2 flex-shrink-0"></span>
                    }
                    <div class="min-w-0 flex-1">
                      <div class="text-[13px] font-semibold text-ink-900 truncate">
                        {{ n.title }}
                      </div>
                      <div class="mt-0.5 text-[12px] text-muted line-clamp-2">
                        {{ n.body }}
                      </div>
                      <div class="mt-1 text-[11px] text-muted">
                        {{ formatDate(n.createdAt) }}
                      </div>
                    </div>
                  </div>
                </button>
              }
            }
          </div>

          @if (facade.hasMore()) {
            <div class="border-t border-line px-4 py-2.5 text-center">
              <button
                type="button"
                class="text-[12px] font-semibold text-brand hover:underline"
                (click)="loadMore()"
              >
                Ver más
              </button>
            </div>
          }

          <div class="border-t border-line px-4 py-2.5 text-center">
            <a
              [routerLink]="viewAllRoute()"
              class="text-[12px] font-semibold text-brand hover:underline"
              (click)="closePanel()"
            >
              Ver todas
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBell {
  /** Ruta absoluta del enlace "Ver todas". Cada layout pasa la suya. */
  readonly viewAllRoute = input<string>('/candidato/notificaciones');

  readonly facade = inject(NotificationFacade);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal(false);

  constructor() {
    afterNextRender(() => {
      this.facade.refreshUnreadCount();
      this.facade.loadNotifications();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  togglePanel(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.facade.loadNotifications();
    }
  }

  closePanel(): void {
    this.isOpen.set(false);
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
      void this.router.navigateByUrl(notification.link);
    }
    this.isOpen.set(false);
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
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
