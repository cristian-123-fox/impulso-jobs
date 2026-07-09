import { Routes } from '@angular/router';
import { JobsPage } from '@/features/public/jobs/pages/jobs-page/jobs-page';
import { JobDetailPage } from '@/features/public/jobs/pages/job-detail-page/job-detail-page';

export const routes: Routes = [
  { path: '', component: JobsPage },
  { path: ':id', component: JobDetailPage }
];
