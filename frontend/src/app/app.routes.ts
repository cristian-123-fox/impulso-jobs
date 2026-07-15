import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@/core/guards/auth.guard';
import { Role } from '@/core/models/role.enum';

export const routes: Routes = [
  {
    path: 'mantenimiento',
    loadChildren: () =>
      import('@/features/public/maintenance/maintenance.routes').then((m) => m.routes),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('@/layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    loadChildren: () =>
      import('@/features/public/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: 'panel',
    canMatch: [authGuard],
    loadChildren: () => import('@/features/panel/panel.routes').then((m) => m.routes),
  },
  {
    path: 'admin',
    canMatch: [roleGuard([Role.ADMIN])],
    loadComponent: () =>
      import('@/layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () => import('@/features/admin/admin.routes').then((m) => m.routes),
  },
  {
    path: '',
    loadComponent: () =>
      import('@/layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'vacantes',
      },
      {
        path: 'inicio',
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
