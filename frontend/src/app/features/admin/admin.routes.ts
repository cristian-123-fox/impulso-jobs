import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'roles', pathMatch: 'full' },
  {
    path: 'roles',
    loadChildren: () =>
      import('@/features/admin/roles/roles.routes').then((m) => m.routes),
  },
];
