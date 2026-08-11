import { Routes } from '@angular/router';
import { ApplicationsFacade } from '@/features/company/applications/data/applications.facade';
import { ApplicationsPage } from '@/features/company/applications/pages/applications-page/applications-page';

export const routes: Routes = [
  {
    path: '',
    providers: [ApplicationsFacade],
    children: [{ path: '', component: ApplicationsPage }],
  },
];
