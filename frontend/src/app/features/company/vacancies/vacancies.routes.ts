import { Routes } from '@angular/router';
import { VacanciesFacade } from '@/features/company/vacancies/data/vacancies.facade';
import { VacanciesListPage } from '@/features/company/vacancies/pages/vacancies-list-page/vacancies-list-page';
import { VacancyDetailPage } from '@/features/company/vacancies/pages/vacancy-detail-page/vacancy-detail-page';
import { VacancyWizardPage } from '@/features/company/vacancies/pages/vacancy-wizard-page/vacancy-wizard-page';

export const routes: Routes = [
  {
    path: '',
    providers: [VacanciesFacade],
    children: [
      { path: '', component: VacanciesListPage },
      // ⚠️ `nueva` va **antes** que `:id`, o el router la tomaría por un id y
      // el wizard intentaría cargar una vacante llamada "nueva".
      { path: 'nueva', component: VacancyWizardPage },
      { path: ':id/editar', component: VacancyWizardPage },
      { path: ':id', component: VacancyDetailPage },
    ],
  },
];
