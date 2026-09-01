import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
