/**
 * Áreas profesionales de la vacante (T15). Espeja el catálogo embebido del
 * backend (`common/catalogs/professional-areas.ts`): los ids son estables y
 * nunca se reordenan. El `slug` alimenta las landings SEO
 * (`trabajo-de-<slug>-en-<estado>`, T16).
 */
export interface ProfessionalArea {
  id: number;
  slug: string;
  name: string;
}

export const PROFESSIONAL_AREAS: readonly ProfessionalArea[] = [
  { id: 1, slug: 'administracion-oficina', name: 'Administración / Oficina' },
  { id: 2, slug: 'agropecuario-veterinaria', name: 'Agropecuario / Veterinaria' },
  { id: 3, slug: 'arte-diseno-medios', name: 'Arte / Diseño / Medios' },
  { id: 4, slug: 'atencion-a-clientes', name: 'Atención a clientes' },
  { id: 5, slug: 'call-center-telemarketing', name: 'Call center / Telemarketing' },
  { id: 6, slug: 'compras-comercio-exterior', name: 'Compras / Comercio exterior' },
  { id: 7, slug: 'comunicacion-publicidad', name: 'Comunicación / Publicidad' },
  { id: 8, slug: 'construccion-obra', name: 'Construcción / Obra' },
  { id: 9, slug: 'contabilidad-finanzas', name: 'Contabilidad / Finanzas' },
  { id: 10, slug: 'direccion-gerencia', name: 'Dirección / Gerencia' },
  { id: 11, slug: 'docencia-educacion', name: 'Docencia / Educación' },
  { id: 12, slug: 'hosteleria-turismo', name: 'Hostelería / Turismo / Gastronomía' },
  { id: 13, slug: 'informatica-telecomunicaciones', name: 'Informática / Telecomunicaciones' },
  { id: 14, slug: 'ingenieria', name: 'Ingeniería' },
  { id: 15, slug: 'legal-asesoria', name: 'Legal / Asesoría' },
  { id: 16, slug: 'logistica-transporte', name: 'Logística / Transporte / Distribución' },
  { id: 17, slug: 'mantenimiento-reparaciones', name: 'Mantenimiento / Reparaciones técnicas' },
  { id: 18, slug: 'medicina-salud', name: 'Medicina / Salud' },
  { id: 19, slug: 'mercadotecnia-relaciones-publicas', name: 'Mercadotecnia / Relaciones públicas' },
  { id: 20, slug: 'produccion-manufactura', name: 'Producción / Operarios / Manufactura' },
  { id: 21, slug: 'recursos-humanos', name: 'Recursos humanos' },
  { id: 22, slug: 'seguridad-vigilancia', name: 'Seguridad / Vigilancia' },
  { id: 23, slug: 'ventas', name: 'Ventas' },
];

/** Lookup id → nombre para cards, detalle y filtros. */
export const PROFESSIONAL_AREA_NAMES: ReadonlyMap<number, string> = new Map(
  PROFESSIONAL_AREAS.map((a) => [a.id, a.name]),
);

/** Lookup por slug para las landings SEO (T16). */
export function professionalAreaBySlug(
  slug: string,
): ProfessionalArea | undefined {
  return PROFESSIONAL_AREAS.find((a) => a.slug === slug);
}
