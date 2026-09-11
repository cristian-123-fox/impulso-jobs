import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
