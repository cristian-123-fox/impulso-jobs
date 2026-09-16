import { Routes } from '@angular/router';

/**
 * «Mi cuenta», la misma página para las tres áreas. Cada una la monta bajo su
 * propio layout (`/admin/mi-cuenta`, `/empresa/mi-cuenta`, `/candidato/mi-cuenta`),
 * porque lo que cambia es el shell, no el contenido: `/account/**` no lleva id
 * y el backend resuelve al titular desde el token.
 *
 * El nombre es `mi-cuenta` y no `perfil` a propósito: `/empresa/perfil` es la
 * ficha fiscal de la empresa y `/candidato/perfil` el perfil profesional del
 * aspirante. Son otra cosa, y ya existen.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@/features/account/pages/account-page/account-page').then(
        (m) => m.AccountPage,
      ),
  },
];
