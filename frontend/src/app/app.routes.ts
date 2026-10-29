import { Routes } from '@angular/router';
import { roleGuard } from '@/core/guards/auth.guard';
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
    path: 'candidato',
    canMatch: [roleGuard([Role.CANDIDATE])],
    loadComponent: () =>
      import('@/layout/candidate-layout/candidate-layout').then(
        (m) => m.CandidateLayout,
      ),
    loadChildren: () =>
      import('@/features/candidate/candidate.routes').then((m) => m.routes),
  },
  {
    path: 'empresa',
    canMatch: [roleGuard([Role.EMPLOYER])],
    loadComponent: () =>
      import('@/layout/company-layout/company-layout').then(
        (m) => m.CompanyLayout,
      ),
    loadChildren: () =>
      import('@/features/company/company.routes').then((m) => m.routes),
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
        /**
         * La entrada de la plataforma es el listado de vacantes: quien llega
         * nuevo viene a postularse.
         *
         * La redirección **real** (301) la hacen el servidor y el `.htaccess`
         * antes de que Angular arranque; esta de aquí cubre `ng serve` y la
         * navegación interna. Si se dejara sólo ésta, el prerender generaría
         * un `index.html` de 249 bytes con `<title>Redirecting</title>` y sin
         * metadatos, que es justo lo que no queremos que vea Google.
         */
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
          import('@/features/public/vacancies/vacancies.routes').then(
            (m) => m.routes,
          ),
      },
      {
        // Landing SEO (T16): la lista con área y estado preconfigurados.
        path: 'trabajo/:landing',
        loadComponent: () =>
          import(
            '@/features/public/vacancies/pages/vacancies-page/vacancies-page'
          ).then((m) => m.VacanciesPage),
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
      // Documentos legales, bajo `/legal` para que el grupo sea lazy sin
      // ensuciar las rutas hermanas del portal. La URL final queda
      // `/legal/aviso-de-privacidad`, que también es mejor para agrupar en un
      // sitemap.
      {
        path: 'legal',
        loadChildren: () =>
          import('@/features/public/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
