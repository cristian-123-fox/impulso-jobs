/** Rol de un usuario dentro de la empresa (`company_users`). */
export enum CompanyMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  MEMBER = 'MEMBER',
}

export const COMPANY_MEMBER_ROLE_LABELS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'Propietario',
  [CompanyMemberRole.ADMIN]: 'Administrador',
  [CompanyMemberRole.RECRUITER]: 'Reclutador',
  [CompanyMemberRole.MEMBER]: 'Miembro',
};

/**
 * Qué implica cada rol interno. Desde los roles de empresa, lo que puede
 * **hacer** un reclutador o un miembro lo decide su rol de acceso; el rol
 * interno sólo dice quién manda sobre el equipo.
 */
export const COMPANY_MEMBER_ROLE_HINTS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]:
    'Titular de la cuenta. Acceso completo y gestiona el equipo y sus roles.',
  [CompanyMemberRole.ADMIN]:
    'Acceso completo y gestiona el equipo y sus roles, sin ser el titular.',
  [CompanyMemberRole.RECRUITER]:
    'Parte del equipo de selección. Lo que puede hacer lo decide su rol de acceso.',
  [CompanyMemberRole.MEMBER]:
    'Parte del equipo. Lo que puede hacer lo decide su rol de acceso.',
};

/** Valor del selector para "sin rol de empresa" (acceso completo). */
export const FULL_ACCESS = 'FULL';

/** Rol de empresa asignado a un miembro; `null` = acceso completo. */
export interface CompanyAccessRole {
  id: string;
  name: string;
}

/** Rol propio de la empresa (`GET /company/roles`). */
export interface CompanyRole {
  id: string;
  name: string;
  description: string | null;
  /** Permisos marcados a mano (sin los fijos). */
  permissionCodes: string[];
  memberCount: number;
  createdAt: string;
}

export interface CompanyPermission {
  code: string;
  label: string;
  description: string;
  group: string;
  /** Lo tiene cualquier rol de empresa: se pinta bloqueado. */
  locked: boolean;
}

export interface CompanyPermissionGroup {
  key: string;
  label: string;
  description: string;
  icon: string;
  order: number;
}

/** Lo que la empresa puede repartir (`GET /company/roles/permissions`). */
export interface CompanyPermissionCatalog {
  groups: CompanyPermissionGroup[];
  permissions: CompanyPermission[];
}

export interface SaveCompanyRolePayload {
  name: string;
  description?: string;
  permissionCodes: string[];
}

/** Sólo estos roles internos pueden tocar el equipo (lo exige el backend). */
export const TEAM_MANAGER_ROLES: readonly CompanyMemberRole[] = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
];

export interface CompanyMember {
  userId: string;
  email: string;
  /** Nombre de la persona, o `null` si no lo ha puesto en «Mi cuenta». */
  displayName: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
  companyRole: CompanyMemberRole;
  /** Rol de empresa que limita sus permisos; `null` = acceso completo. */
  accessRole: CompanyAccessRole | null;
  /** Estado de la cuenta de plataforma (ACTIVE/INACTIVE/SUSPENDED). */
  status: string;
  emailVerified: boolean;
  lastLogin: string | null;
  joinedAt: string;
}

/** Alta: o se vincula una cuenta existente (`userId`) o se crea una nueva. */
export interface AddCompanyMemberPayload {
  role: CompanyMemberRole;
  /** `null` = acceso completo. Sólo aplica a reclutador y miembro. */
  accessRoleId?: string | null;
  userId?: string;
  email?: string;
  password?: string;
}
