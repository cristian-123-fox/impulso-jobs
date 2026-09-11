import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@/shared/notifications/notifications-page').then(
        (m) => m.NotificationsPage,
      ),
  },
];
