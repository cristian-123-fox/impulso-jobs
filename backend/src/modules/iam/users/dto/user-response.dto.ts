import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';

/** Datos del perfil asociados a la cuenta, resueltos por el caso de uso. */
export interface UserProfileSummary {
  /** Nombre para mostrar: candidato (nombre + apellido) o empresa. */
  displayName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyRole?: string | null;
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

  @ApiPropertyOptional({ nullable: true })
  displayName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  companyRole?: string | null;
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
    displayName: profile.displayName ?? null,
    companyId: profile.companyId ?? null,
    companyName: profile.companyName ?? null,
    companyRole: profile.companyRole ?? null,
  };
}
