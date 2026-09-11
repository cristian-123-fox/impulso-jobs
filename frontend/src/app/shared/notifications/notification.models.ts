export type NotificationType =
  | 'APPLICATION_STATUS_CHANGED'
  | 'SAVED_VACANCY_CLOSED'
  | 'EMAIL_VERIFICATION'
  | 'NEW_APPLICATION_RECEIVED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'PROMOTION_EXPIRED'
  | 'VACANCY_REPORT_RESOLVED'
  | 'VACANCY_REPORT_NEW'
  | 'PAYMENT_PENDING_CONFIRM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UnreadCount {
  count: number;
}
