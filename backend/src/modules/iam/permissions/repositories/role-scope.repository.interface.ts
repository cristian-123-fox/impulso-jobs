import { RoleScope } from '@/common/types/role-scope.enum';

export const ROLE_SCOPE_REPOSITORY = 'ROLE_SCOPE_REPOSITORY';

/** Lo mínimo del rol que necesita la autorización para aplicar la base. */
export interface RoleScopeRow {
  id: string;
  code: string;
  scope: RoleScope;
  isSystem: boolean;
  /** Informado si el rol pertenece a una empresa. */
  companyId: string | null;
}

/**
 * Lectura de `roles` **desde el módulo de permisos**, en sólo lectura y en
 * lote. Es el mismo patrón que `ICompanyPlanRepository`: `RolesModule` importa
 * `PermissionsModule`, así que inyectar aquí `ROLE_REPOSITORY` cerraría un
 * ciclo de DI — importar la clase de entidad, en cambio, no crea ciclo.
 *
 * Escribir sobre un rol sigue siendo exclusivo de `roles/`.
 */
export interface IRoleScopeRepository {
  findAll(): Promise<RoleScopeRow[]>;
}
