import { AboutTeamMember } from '@/features/public/about/models/about.models';

/**
 * Equipo real de Impulso Jobs.
 *
 * Las fotos todavía no están: el componente pinta las iniciales con el color
 * del `tone`. Cuando lleguen, añade `photo: '/assets/images/team/<id>.webp'`
 * (cuadrada, 800×800, WebP, <200 KB) y la tarjeta la usará sola.
 *
 * Para añadir a alguien:
 *   1. Sube su foto a `public/assets/images/team/<id>.webp`.
 *   2. Añade una entrada con `name`, `roleKey`, `bioKey`, `tone`, `icon`,
 *      `order` y, si aplica, `photo` y `linkedin`.
 *   3. Añade `about.team.members.<id>.role` y `.bio` en `es.json` y `en.json`.
 */
export const TEAM_MEMBERS: readonly AboutTeamMember[] = [
  {
    id: 'cristian-galaviz',
    name: 'Cristian Galaviz',
    roleKey: 'about.team.members.cristian-galaviz.role',
    bioKey: 'about.team.members.cristian-galaviz.bio',
    order: 1,
    tone: 'brand',
    icon: 'award',
  },
  {
    id: 'karla-garcia',
    name: 'Karla García',
    roleKey: 'about.team.members.karla-garcia.role',
    bioKey: 'about.team.members.karla-garcia.bio',
    order: 2,
    tone: 'pink',
    icon: 'headset',
  },
  {
    id: 'sebastian-tovar',
    name: 'Sebastián Tovar Chávez',
    roleKey: 'about.team.members.sebastian-tovar.role',
    bioKey: 'about.team.members.sebastian-tovar.bio',
    order: 3,
    tone: 'blue',
    icon: 'code',
  },
  {
    id: 'oscar-ruiz',
    name: 'Óscar Daniel Ruiz',
    roleKey: 'about.team.members.oscar-ruiz.role',
    bioKey: 'about.team.members.oscar-ruiz.bio',
    order: 4,
    tone: 'green',
    icon: 'code',
  },
  {
    id: 'cristian-medina',
    name: 'Cristian Medina',
    roleKey: 'about.team.members.cristian-medina.role',
    bioKey: 'about.team.members.cristian-medina.bio',
    order: 5,
    tone: 'amber',
    icon: 'search',
  },
];
