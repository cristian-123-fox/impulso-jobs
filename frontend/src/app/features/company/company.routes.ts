import { Routes } from '@angular/router';

export const routes: Routes = [
  // El panel **es** la entrada del área: lo primero que ve la empresa al
  // iniciar sesión. Antes se caía directamente en el listado de vacantes.
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import(
        '@/features/company/dashboard/pages/company-dashboard-page/company-dashboard-page'
      ).then((m) => m.CompanyDashboardPage),
  },
  {
    path: 'vacantes',
    loadChildren: () =>
      import('@/features/company/vacancies/vacancies.routes').then(
        (m) => m.routes,
      ),
  },
  {
    path: 'postulaciones',
    loadChildren: () =>
      import('@/features/company/applications/applications.routes').then(
        (m) => m.routes,
      ),
  },
  {
    path: 'candidatos',
    loadChildren: () =>
      import('@/features/company/candidates/candidates.routes').then(
        (m) => m.routes,
      ),
  },
  {
    path: 'promociones',
    loadChildren: () =>
      import('@/features/company/billing/billing.routes').then((m) => m.routes),
  },
  {
    path: 'usuarios',
    loadChildren: () =>
      import('@/features/company/team/team.routes').then((m) => m.routes),
  },
  {
    path: 'perfil',
    loadChildren: () =>
      import('@/features/company/profile/profile.routes').then((m) => m.routes),
  },
  {
    path: 'notificaciones',
    loadChildren: () =>
      import('@/features/company/notifications/notifications.routes').then(
        (m) => m.routes,
      ),
  },
  {
    path: 'mi-cuenta',
    loadChildren: () =>
      import('@/features/account/account.routes').then((m) => m.routes),
  },
];
