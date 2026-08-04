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
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
  emailVerified?: boolean;
  companyId?: string;
  companyRole?: CompanyMemberRole;
  candidate?: CandidatePayload;
}

export interface UpdateUserPayload {
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  emailVerified?: boolean;
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
