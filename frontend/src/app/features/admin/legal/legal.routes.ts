import { Routes } from '@angular/router';
import { LegalConsentsPage } from '@/features/admin/legal/pages/legal-consents-page/legal-consents-page';

/** Consulta del registro de aceptaciones. Sólo lectura, sin acciones. */
export const routes: Routes = [{ path: '', component: LegalConsentsPage }];
