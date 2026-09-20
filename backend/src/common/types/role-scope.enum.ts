/**
 * A quién sirve un rol. Separa el back-office del autoservicio de la empresa
 * y deja al aspirante fuera de la administración de permisos.
 *
 * - `PLATFORM` — personal de Impulso Jobs (`/admin`). Incluye ADMIN.
 * - `COMPANY`  — cuentas de empresa (`/empresa`). Incluye EMPLOYER.
 * - `CANDIDATE` — el aspirante. **No se administra**: sus permisos están
 *   fijados en código (`SCOPE_BASELINE`), no en `role_permissions`, así que
 *   postular o subir un CV no puede romperse desde el back-office ni por un
 *   despliegue en el que nadie corrió `pnpm seed`.
 */
export enum RoleScope {
  PLATFORM = 'PLATFORM',
  COMPANY = 'COMPANY',
  CANDIDATE = 'CANDIDATE',
}

/** Los dos ámbitos que sí se administran desde `/admin/roles`. */
export const ADMINISTRABLE_ROLE_SCOPES: readonly RoleScope[] = [
  RoleScope.PLATFORM,
  RoleScope.COMPANY,
];
