import { Routes } from '@angular/router';
import { CandidatesFacade } from '@/features/company/candidates/data/candidates.facade';
import { CandidatesPage } from '@/features/company/candidates/pages/candidates-page/candidates-page';

export const routes: Routes = [
  {
    path: '',
    providers: [CandidatesFacade],
    children: [{ path: '', component: CandidatesPage }],
  },
];
