import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@/layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@/features/public/home/home.routes').then((m) => m.routes),
      },
      {
        path: 'contacto',
        loadChildren: () =>
          import('@/features/public/contact/contact.routes').then((m) => m.routes),
      },
      {
        path: 'nosotros',
        loadChildren: () =>
          import('@/features/public/about/about.routes').then((m) => m.routes),
      },
      {
        path: 'vacantes',
        loadChildren: () =>
          import('@/features/public/jobs/jobs.routes').then((m) => m.routes),
      },
      {
        path: 'faq',
        loadChildren: () =>
          import('@/features/public/faq/faq.routes').then((m) => m.routes),
      },
      {
        path: 'planes',
        loadChildren: () =>
          import('@/features/public/plans/plans.routes').then((m) => m.routes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
