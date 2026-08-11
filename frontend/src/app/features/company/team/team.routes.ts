import { Routes } from '@angular/router';
import { TeamFacade } from '@/features/company/team/data/team.facade';
import { TeamPage } from '@/features/company/team/pages/team-page/team-page';

export const routes: Routes = [
  {
    path: '',
    providers: [TeamFacade],
    children: [{ path: '', component: TeamPage }],
  },
];
