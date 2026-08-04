import { Routes } from '@angular/router';
import { VacanciesPage } from '@/features/public/vacancies/pages/vacancies-page/vacancies-page';
import { PublicVacancyDetailPage } from '@/features/public/vacancies/pages/public-vacancy-detail-page/public-vacancy-detail-page';

export const routes: Routes = [
  { path: '', component: VacanciesPage },
  { path: ':id', component: PublicVacancyDetailPage },
];
