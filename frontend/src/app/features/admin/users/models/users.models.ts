import { Role } from '@/core/models/role.enum';

export { ROLE_LABELS } from '@/core/models/role.enum';

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
  /** País emisor del documento (T36). */
  documentCountry?: string;
  documentType?: string;
  documentNumber?: string;
  curp?: string | null;
  birthDate?: string;
  professionalTitle?: string | null;
  /** País de residencia. Sin él, `state` es ambiguo (`GUA`, `DC`). */
  country?: string;
  state?: string;
  municipality?: string;
  phone?: string | null;
  phoneCountry?: string | null;
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
  /** Identidad de la persona, guardada en `users` (única fuente para ADMIN). */
  firstName: string | null;
  lastName: string | null;
  /** E.164; se pinta con `formatPhone(phoneCountry, phone)` (T36). */
  phone: string | null;
  phoneCountry: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
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
  /** Clave de columna; debe existir en `USER_SORT_COLUMNS` del backend. */
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

export interface CandidatePayload {
  firstName: string;
  lastName: string;
  /** ISO 3166-1 alpha-2. Obligatorio desde T36: decide documento y estado. */
  country: string;
  documentCountry?: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  state: string;
  municipality: string;
  professionalTitle?: string;
  phone?: string | null;
  phoneCountry?: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: Role;
  /** Obligatorios para ADMIN: es su único nombre. */
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneCountry?: string;
  jobTitle?: string;
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
  country?: string;
  documentCountry?: string;
  documentType?: string;
  documentNumber?: string;
  curp?: string;
  birthDate?: string;
  professionalTitle?: string;
  state?: string;
  municipality?: string;
  phone?: string | null;
  phoneCountry?: string | null;
}

export interface UpdateUserPayload {
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneCountry?: string;
  jobTitle?: string;
  adminNotes?: string;
  candidateProfile?: UpdateCandidateProfilePayload;
  companyId?: string;
  companyRole?: CompanyMemberRole;
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Activo',
  [UserStatus.INACTIVE]: 'Inactivo',
  [UserStatus.SUSPENDED]: 'Suspendido',
};
