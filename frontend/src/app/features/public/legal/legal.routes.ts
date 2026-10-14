import type { Routes } from '@angular/router';
import { LegalDocCode } from '@/shared/catalogs/legal.catalogs';
import { CopyrightNoticePage } from '@/features/public/legal/pages/copyright-notice-page/copyright-notice-page';
import { LegalPage } from '@/features/public/legal/pages/legal-page/legal-page';

/**
 * Los cinco documentos legales, con URL en español y sin parámetros.
 *
 * Se eligen rutas explícitas y no un `:code` por dos razones. Una: las rutas de
 * cara al usuario van en español en todo el portal (`/vacantes`, `/planes`) y
 * `/legal/PRIVACY` rompe esa convención y llega a los buscadores en mayúsculas.
 * Dos: `LegalPage` lee el código de `data`, no de un parámetro, así que una
 * URL mal escrita cae en el `**` del portal y redirige, en lugar de lanzar un
 * error dentro de la plantilla.
 *
 * Cada ruta declara su código en `data`, que es la única fuente: si alguien
 * añade una sexta página, basta con añadir una entrada aquí y su fila en
 * `LEGAL_DOCUMENTS`, y no hay dos listas que puedan desincronizarse.
 */
export const LEGAL_ROUTES: Routes = [
  {
    // Aviso y contraaviso de derechos de autor (arts. 114 Septies y 114 Octies
    // LFDA). Página propia y no una sección más: tiene formulario.
    path: 'aviso-de-derechos-de-autor',
    component: CopyrightNoticePage,
  },
  {
    path: 'aviso-de-privacidad',
    component: LegalPage,
    data: { code: LegalDocCode.PRIVACY },
  },
  {
    path: 'terminos-y-condiciones',
    component: LegalPage,
    data: { code: LegalDocCode.TERMS },
  },
  {
    path: 'politica-de-cookies',
    component: LegalPage,
    data: { code: LegalDocCode.COOKIES },
  },
  {
    path: 'politica-de-reembolso',
    component: LegalPage,
    data: { code: LegalDocCode.REFUND },
  },
  {
    path: 'cesion-de-derechos-de-imagen',
    component: LegalPage,
    data: { code: LegalDocCode.IMAGE_RIGHTS },
  },
];