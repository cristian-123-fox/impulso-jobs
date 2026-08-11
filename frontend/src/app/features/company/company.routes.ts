import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'vacantes', pathMatch: 'full' },
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
];
