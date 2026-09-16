/** Rol de plataforma que informa la API (fuente para enrutar y guards). */
export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYER = 'EMPLOYER',
  CANDIDATE = 'CANDIDATE',
}

/**
 * Etiqueta visible de cada rol. Vive junto al enum y no en un feature porque
 * lo usan tanto el back-office (alta y edición de cuentas) como «Mi cuenta»,
 * que es transversal a las tres áreas.
 */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.EMPLOYER]: 'Empresa / Reclutador',
  [Role.CANDIDATE]: 'Aspirante',
};
