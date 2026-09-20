import { Routes } from '@angular/router';

/** Área real del candidato — sustituye al prototipo `/panel`. */
export const routes: Routes = [
  // El panel **es** la entrada del área: antes se caía en el formulario de
  // perfil, que no dice nada sobre cómo va la búsqueda de empleo.
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import(
        '@/features/candidate/dashboard/pages/candidate-dashboard-page/candidate-dashboard-page'
      ).then((m) => m.CandidateDashboardPage),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('@/features/candidate/pages/candidate-profile-page/candidate-profile-page').then(
        (m) => m.CandidateProfilePage,
      ),
  },
  {
    path: 'cv',
    loadComponent: () =>
      import('@/features/candidate/pages/candidate-resumes-page/candidate-resumes-page').then(
        (m) => m.CandidateResumesPage,
      ),
  },
  {
    path: 'postulaciones',
    loadComponent: () =>
      import(
        '@/features/candidate/pages/candidate-applications-page/candidate-applications-page'
      ).then((m) => m.CandidateApplicationsPage),
  },
  {
    path: 'guardadas',
    loadComponent: () =>
      import(
        '@/features/candidate/pages/candidate-saved-vacancies-page/candidate-saved-vacancies-page'
      ).then((m) => m.CandidateSavedVacanciesPage),
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('@/features/candidate/pages/candidate-settings-page/candidate-settings-page').then(
        (m) => m.CandidateSettingsPage,
      ),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('@/features/candidate/pages/notifications/notifications-page').then(
        (m) => m.NotificationsPage,
      ),
  },
  {
    path: 'mi-cuenta',
    loadChildren: () =>
      import('@/features/account/account.routes').then((m) => m.routes),
  },
];
