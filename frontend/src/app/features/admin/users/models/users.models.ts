import { Role } from '@/core/models/role.enum';

/** Estado de la cuenta (espeja `UserStatus` del backend). */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/** Rol dentro de la empresa (`company_users`). */
export enum CompanyMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  MEMBER = 'MEMBER',
}

/** Rol de plataforma asignado en `user_roles`. */
export interface AssignedRole {
  id: string;
  code: string;
  name: string;
  /** `true` en los roles base (ADMIN/EMPLOYER/CANDIDATE). */
  isSystem: boolean;
}

/** Datos del perfil del candidato en la respuesta del admin. */
export interface CandidateProfileData {
  firstName?: string;
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  curp?: string | null;
  birthDate?: string;
  professionalTitle?: string | null;
  state?: string;
  municipality?: string;
  phone?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  /** Bloqueo temporal por intentos fallidos (distinto de `status`). */
  temporarilyBlocked: boolean;
  blockedUntil: string | null;
  lastLogin: string | null;
  createdAt: string;
  displayName: string | null;
  companyId: string | null;
  companyName: string | null;
  companyRole: string | null;
  /** Roles asignados: el base más los personalizados. */
  roles: AssignedRole[];
  /** Datos del perfil del candidato (solo para rol CANDIDATE). */
  candidateProfile?: CandidateProfileData | null;
  /** Notas internas del administrador sobre esta cuenta. */
  adminNotes?: string | null;
}

export interface UserStats {
  total: number;
  admins: number;
  employers: number;
  candidates: number;
  inactive: number;
}

export interface UsersPage {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stats: UserStats;
}

export interface UsersFilters {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page: number;
  limit: number;
}

export interface CandidatePayload {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  state: string;
  municipality: string;
  professionalTitle?: string;
  phone?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
  emailVerified?: boolean;
  companyId?: string;
  companyRole?: CompanyMemberRole;
  /** Roles personalizados adicionales al rol base. */
  extraRoleIds?: string[];
  candidate?: CandidatePayload;
}

export interface UpdateCandidateProfilePayload {
  firstName?: string;
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  curp?: string;
  birthDate?: string;
  professionalTitle?: string;
  state?: string;
  municipality?: string;
  phone?: string;
}

export interface UpdateUserPayload {
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  emailVerified?: boolean;
  adminNotes?: string;
  candidateProfile?: UpdateCandidateProfilePayload;
  companyId?: string;
  companyRole?: CompanyMemberRole;
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.EMPLOYER]: 'Empresa / Reclutador',
  [Role.CANDIDATE]: 'Aspirante',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Activo',
  [UserStatus.INACTIVE]: 'Inactivo',
  [UserStatus.SUSPENDED]: 'Suspendido',
};
