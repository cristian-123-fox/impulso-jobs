import { Routes } from '@angular/router';
import { CompaniesFacade } from '@/features/admin/companies/data/companies.facade';
import { CompaniesListPage } from '@/features/admin/companies/pages/companies-list-page/companies-list-page';

export const routes: Routes = [
  {
    path: '',
    providers: [CompaniesFacade],
    children: [{ path: '', component: CompaniesListPage }],
  },
];
