import { MX_STATES } from '@/shared/catalogs/mx.catalogs';

/** Slug URL-safe: minúsculas, sin acentos, separado por guiones (T16). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ruta canónica del detalle público: `/vacantes/<uuid>-<slug-del-titulo>`.
 * El backend sólo necesita el UUID (los primeros 36 caracteres del parámetro);
 * el slug existe para SEO y legibilidad.
 */
export function vacancyPath(vacancy: { id: string; title: string }): string {
  const slug = slugify(vacancy.title);
  return slug ? `/vacantes/${vacancy.id}-${slug}` : `/vacantes/${vacancy.id}`;
}

const STATE_BY_SLUG = new Map(MX_STATES.map((s) => [slugify(s.name), s]));

/** Estado MX por slug de nombre (`jalisco`, `nuevo-leon`) para las landings. */
export function stateBySlug(
  slug: string,
): { code: string; name: string } | undefined {
  return STATE_BY_SLUG.get(slug);
}

/** Slug del estado para construir URLs de landing. */
export function stateSlugOf(code: string): string | undefined {
  const state = MX_STATES.find((s) => s.code === code);
  return state ? slugify(state.name) : undefined;
}
