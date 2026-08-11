import { Routes } from '@angular/router';
import { PlansFacade } from '@/features/admin/plans/data/plans.facade';
import { PlansListPage } from '@/features/admin/plans/pages/plans-list-page/plans-list-page';

export const routes: Routes = [
  {
    path: '',
    // El catálogo (planes + beneficios) se cachea en la fachada del feature.
    providers: [PlansFacade],
    children: [{ path: '', component: PlansListPage }],
  },
];
