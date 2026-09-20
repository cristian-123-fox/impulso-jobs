import { IconName } from '@/shared/ui';

/**
 * A quién sirve un rol. `CANDIDATE` existe en la API pero **no se administra**:
 * los permisos del aspirante están fijados en el backend, así que el
 * back-office no lo lista ni lo deja crear.
 */
export type RoleScope = 'PLATFORM' | 'COMPANY' | 'CANDIDATE';

/** Los dos ámbitos con pestaña en `/admin/roles`. */
export const ADMINISTRABLE_SCOPES: readonly RoleScope[] = [
  'PLATFORM',
  'COMPANY',
];

export interface RoleScopeMeta {
  readonly scope: RoleScope;
  readonly label: string;
  readonly hint: string;
  readonly icon: IconName;
}

export const ROLE_SCOPE_META: Readonly<Record<RoleScope, RoleScopeMeta>> = {
  PLATFORM: {
    scope: 'PLATFORM',
    label: 'Administración',
    hint: 'Personal de Impulso Jobs que trabaja en el back-office.',
    icon: 'shield',
  },
  COMPANY: {
    scope: 'COMPANY',
    label: 'Empresa',
    hint: 'Cuentas de empresa que publican vacantes y gestionan su equipo.',
    icon: 'building',
  },
  CANDIDATE: {
    scope: 'CANDIDATE',
    label: 'Aspirante',
    hint: 'Sus permisos son fijos: no se administran desde aquí.',
    icon: 'user',
  },
};

export interface Permission {
  id: string;
  code: string;
  component: string;
  description: string | null;
  /** Etiqueta en castellano; es lo que se lee en el árbol. */
  label: string;
  /** Clave del grupo dentro de `PermissionCatalog.groups`. */
  group: string;
  /** Ámbitos a los que se puede ofrecer. */
  scopes: RoleScope[];
}

export interface PermissionGroup {
  key: string;
  label: string;
  description: string;
  icon: string;
  order: number;
}

/** Respuesta de `GET /permissions`: permisos + grupos + base por ámbito. */
export interface PermissionCatalog {
  permissions: Permission[];
  groups: PermissionGroup[];
  baseline: Record<RoleScope, string[]>;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  scope: RoleScope;
  /** Presente en el listado (`GET /roles`). */
  permissionCount?: number;
  /** Presente en el detalle (`GET /roles/:id`). */
  permissionIds?: string[];
  /**
   * Presente en el detalle. Permisos que el rol tiene **siempre**: la base de
   * su ámbito y, en el ADMIN de sistema, lo que abre el back-office. Van
   * marcados y no se pueden desmarcar.
   */
  lockedPermissionIds?: string[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  scope: RoleScope;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}
