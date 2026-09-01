import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
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
    path: 'denuncias',
    loadChildren: () =>
      import('@/features/admin/reports/reports.routes').then((m) => m.routes),
  },
];
