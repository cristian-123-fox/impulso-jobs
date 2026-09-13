import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';

/** Rol de plataforma asignado en `user_roles`. */
export interface AssignedRoleDto {
  id: string;
  code: string;
  name: string;
  /** `true` en los roles base (ADMIN/EMPLOYER/CANDIDATE) del seed. */
  isSystem: boolean;
}

/** Datos del perfil del candidato para la respuesta del admin. */
export interface CandidateProfileSummary {
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

/** Datos del perfil asociados a la cuenta, resueltos por el caso de uso. */
export interface UserProfileSummary {
  /** Nombre para mostrar: candidato (nombre + apellido) o empresa. */
  displayName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyRole?: string | null;
  /** Todos los roles asignados; el guard usa estos, no `role`. */
  roles?: AssignedRoleDto[];
  /** Datos del perfil del candidato (solo para rol CANDIDATE). */
  candidateProfile?: CandidateProfileSummary;
  /** Notas internas del administrador sobre esta cuenta. */
  adminNotes?: string | null;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  emailVerified!: boolean;

  /** Bloqueo temporal por intentos fallidos (distinto de `status`). */
  @ApiProperty()
  temporarilyBlocked!: boolean;

  @ApiProperty({ nullable: true })
  blockedUntil!: string | null;

  @ApiProperty({ nullable: true })
  lastLogin!: string | null;

  @ApiProperty()
  createdAt!: string;

  /** Fecha de baja (M13). `null` en las cuentas vigentes. */
  @ApiProperty({ nullable: true })
  deletedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  displayName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyRole?: string | null;

  /** Roles de plataforma asignados (base + adicionales). */
  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  roles?: AssignedRoleDto[];

  /** Datos del perfil del candidato (solo para rol CANDIDATE). */
  @ApiPropertyOptional({ nullable: true })
  candidateProfile?: CandidateProfileSummary | null;

  /** Notas internas del administrador sobre esta cuenta. */
  @ApiPropertyOptional({ nullable: true })
  adminNotes?: string | null;
}

export function toUserResponse(
  user: User,
  profile: UserProfileSummary = {},
): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    temporarilyBlocked: Boolean(
      user.blockedUntil && user.blockedUntil.getTime() > Date.now(),
    ),
    blockedUntil: user.blockedUntil?.toISOString() ?? null,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    displayName: profile.displayName ?? null,
    companyId: profile.companyId ?? null,
    companyName: profile.companyName ?? null,
    companyRole: profile.companyRole ?? null,
    roles: profile.roles ?? [],
    candidateProfile: profile.candidateProfile ?? null,
    adminNotes: profile.adminNotes ?? null,
  };
}
