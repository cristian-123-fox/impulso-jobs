import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    /**
     * `/` no se prerenderiza a propósito.
     *
     * La ruta redirige a `/vacantes`, y prerenderizar una redirección produce
     * un `index.html` de ~249 bytes con `<title>Redirecting</title>` y sin
     * metadatos. Ese archivo era el que se servía en la raíz del dominio.
     * La redirección real la hacen `server.ts` (301) y el `.htaccess`; aquí
     * sólo se evita generar el stub.
     */
    path: '',
    renderMode: RenderMode.Client,
  },
  // T26: el portal público se renderiza **por petición**, no se prerenderiza.
  // Un HTML estático se congela en un idioma en tiempo de build, así que con
  // prerender la cookie `ij_lang` no podía influir y el portal salía siempre en
  // español, cambiando de idioma sólo al hidratar (parpadeo y riesgo de
  // desajuste). Vale igual para `/auth/**`, que también está traducido.
  //
  // `/mantenimiento` sigue prerenderizado **a propósito**: es la página que se
  // sirve cuando el resto no funciona, así que no debe depender de que el
  // proceso Node esté sano. Su texto sale en español (ver TASKS.md · T26).
  {
    path: 'inicio',
    renderMode: RenderMode.Server,
  },
  {
    path: 'auth/**',
    renderMode: RenderMode.Server,
  },
  {
    path: 'nosotros',
    renderMode: RenderMode.Server,
  },
  {
    path: 'planes',
    renderMode: RenderMode.Server,
  },
  {
    path: 'contacto',
    renderMode: RenderMode.Server,
  },
  {
    path: 'faq',
    renderMode: RenderMode.Server,
  },
  {
    // T16: la lista pública se sirve renderizada (los crawlers ven vacantes,
    // no el cascarón vacío del prerender genérico).
    path: 'vacantes',
    renderMode: RenderMode.Server,
  },
  {
    path: 'vacantes/:id',
    renderMode: RenderMode.Server,
  },
  {
    // T16: landings SEO "trabajo de <área> en <estado>".
    path: 'trabajo/:landing',
    renderMode: RenderMode.Server,
  },
  {
    // Área autenticada, con datos por API: se renderiza en cliente (no prerender).
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'candidato',
    renderMode: RenderMode.Client,
  },
  {
    path: 'candidato/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'empresa',
    renderMode: RenderMode.Client,
  },
  {
    path: 'empresa/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
