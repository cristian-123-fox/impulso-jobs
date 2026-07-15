import { Routes } from '@angular/router';
import { RolesFacade } from '@/features/admin/roles/data/roles.facade';
import { RolesListPage } from '@/features/admin/roles/pages/roles-list-page/roles-list-page';
import { RoleDetailPage } from '@/features/admin/roles/pages/role-detail-page/role-detail-page';

export const routes: Routes = [
  {
    path: '',
    // Fachada compartida entre listado y detalle (cachea roles/permisos).
    providers: [RolesFacade],
    children: [
      { path: '', component: RolesListPage },
      { path: ':id', component: RoleDetailPage },
    ],
  },
];
