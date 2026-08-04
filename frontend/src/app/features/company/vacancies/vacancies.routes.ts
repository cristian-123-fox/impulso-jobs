import { Routes } from '@angular/router';
import { VacanciesFacade } from '@/features/company/vacancies/data/vacancies.facade';
import { VacanciesListPage } from '@/features/company/vacancies/pages/vacancies-list-page/vacancies-list-page';
import { VacancyDetailPage } from '@/features/company/vacancies/pages/vacancy-detail-page/vacancy-detail-page';

export const routes: Routes = [
  {
    path: '',
    providers: [VacanciesFacade],
    children: [
      { path: '', component: VacanciesListPage },
      { path: ':id', component: VacancyDetailPage },
    ],
  },
];
