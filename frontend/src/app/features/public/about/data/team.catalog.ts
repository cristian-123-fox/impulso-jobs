import { AboutTeamMember } from '@/features/public/about/models/about.models';

/**
 * Equipo de Impulso Jobs.
 *
 * ⚠️ **Los tres registros de abajo son de ejemplo.** `AboutFacade` los filtra
 * cuando `environment.production` es true, así que no llegan al sitio público.
 *
 * Para publicar a una persona real:
 *   1. Sube su foto a `public/assets/images/team/<id>.webp` (cuadrada, 800×800,
 *      WebP, <200 KB, mismo fondo y encuadre que el resto).
 *   2. Duplica una entrada, **quita `isPlaceholder`** y rellena `name`,
 *      `roleKey`, `bioKey`, `photo` (opcional), `linkedin` (opcional) y `order`.
 *   3. Añade `about.team.members.<id>.role` y `.bio` en `es.json` y `en.json`.
 *
 * No inventes nombres ni cargos en producción. Un equipo ficticio es peor que
 * no tener la sección.
 */
export const TEAM_MEMBERS: readonly AboutTeamMember[] = [
  {
    id: 'direccion',
    name: 'Nombre Apellido',
    roleKey: 'about.team.members.direccion.role',
    bioKey: 'about.team.members.direccion.bio',
    order: 1,
    isPlaceholder: true,
  },
  {
    id: 'producto',
    name: 'Nombre Apellido',
    roleKey: 'about.team.members.producto.role',
    bioKey: 'about.team.members.producto.bio',
    order: 2,
    isPlaceholder: true,
  },
  {
    id: 'tecnologia',
    name: 'Nombre Apellido',
    roleKey: 'about.team.members.tecnologia.role',
    bioKey: 'about.team.members.tecnologia.bio',
    order: 3,
    isPlaceholder: true,
  },
];
