import { Routes } from '@angular/router';
import { BillingFacade } from '@/features/company/billing/data/billing.facade';
import { PromotionsPage } from '@/features/company/billing/pages/promotions-page/promotions-page';

export const routes: Routes = [
  {
    path: '',
    providers: [BillingFacade],
    children: [{ path: '', component: PromotionsPage }],
  },
];
