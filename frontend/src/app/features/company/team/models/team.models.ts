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

/** Qué puede hacer cada rol interno, para explicarlo en la interfaz. */
export const COMPANY_MEMBER_ROLE_HINTS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]:
    'Titular de la cuenta: gestiona la empresa, su equipo y la facturación.',
  [CompanyMemberRole.ADMIN]:
    'Administra la empresa y su equipo, sin ser el titular.',
  [CompanyMemberRole.RECRUITER]:
    'Publica vacantes y gestiona candidatos y postulaciones.',
  [CompanyMemberRole.MEMBER]:
    'Acceso básico de consulta a la información de la empresa.',
};

/** Sólo estos roles internos pueden tocar el equipo (lo exige el backend). */
export const TEAM_MANAGER_ROLES: readonly CompanyMemberRole[] = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
];

export interface CompanyMember {
  userId: string;
  email: string;
  companyRole: CompanyMemberRole;
  /** Estado de la cuenta de plataforma (ACTIVE/INACTIVE/SUSPENDED). */
  status: string;
  emailVerified: boolean;
  lastLogin: string | null;
  joinedAt: string;
}

/** Alta: o se vincula una cuenta existente (`userId`) o se crea una nueva. */
export interface AddCompanyMemberPayload {
  role: CompanyMemberRole;
  userId?: string;
  email?: string;
  password?: string;
}
