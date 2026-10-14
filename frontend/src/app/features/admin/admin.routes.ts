import { Routes } from '@angular/router';

export const routes: Routes = [
  // El panel **es** la entrada del back-office: antes se caía directamente en
  // el listado de usuarios, que es una herramienta, no una visión de conjunto.
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import(
        '@/features/admin/dashboard/pages/admin-dashboard-page/admin-dashboard-page'
      ).then((m) => m.AdminDashboardPage),
  },
  {
    path: 'usuarios',
    loadChildren: () =>
      import('@/features/admin/users/users.routes').then((m) => m.routes),
  },
  {
    path: 'empresas',
    loadChildren: () =>
      import('@/features/admin/companies/companies.routes').then(
        (m) => m.routes,
      ),
  },
  {
    path: 'roles',
    loadChildren: () =>
      import('@/features/admin/roles/roles.routes').then((m) => m.routes),
  },
  {
    path: 'planes',
    loadChildren: () =>
      import('@/features/admin/plans/plans.routes').then((m) => m.routes),
  },
  {
    path: 'pagos',
    loadChildren: () =>
      import('@/features/admin/payments/payments.routes').then(
        (m) => m.routes,
      ),
  },
  {
    // Consulta del registro de consentimientos (sólo lectura). Va despues de
    // pagos y antes de denuncias porque es lo que se mira cuando llega una
    // reclamacion o una solicitud de ARCO.
    path: 'legal',
    loadChildren: () =>
      import('@/features/admin/legal/legal.routes').then((m) => m.routes),
  },
  {
    path: 'denuncias',
    loadChildren: () =>
      import('@/features/admin/reports/reports.routes').then((m) => m.routes),
  },
  {
    path: 'mi-cuenta',
    loadChildren: () =>
      import('@/features/account/account.routes').then((m) => m.routes),
  },
  {
    path: 'notificaciones',
    loadChildren: () =>
      import('@/features/admin/notifications/notifications.routes').then(
        (m) => m.routes,
      ),
  },
];
