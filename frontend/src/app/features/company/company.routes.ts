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
];
