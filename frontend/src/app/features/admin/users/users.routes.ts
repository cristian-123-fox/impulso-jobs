import { Routes } from '@angular/router';
import { UsersFacade } from '@/features/admin/users/data/users.facade';
import { UsersListPage } from '@/features/admin/users/pages/users-list-page/users-list-page';

export const routes: Routes = [
  {
    path: '',
    providers: [UsersFacade],
    children: [{ path: '', component: UsersListPage }],
  },
];
