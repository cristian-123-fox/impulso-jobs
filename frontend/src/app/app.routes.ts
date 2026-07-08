import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/public/home/home.routes').then((m) => m.routes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
