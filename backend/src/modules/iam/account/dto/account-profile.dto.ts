import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Role } from '@/common/types/role.enum';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';
import { User } from '@/modules/iam/users/entities/user.entity';

/**
 * La propia cuenta, tal y como está en `users`. Es deliberadamente la fila
 * cruda y no el nombre resuelto: quien edita aquí escribe en `users`, así que
 * mostrar el nombre que `UserProfileResolver` saca de `candidate_profiles` o
 * de `companies` haría que el formulario enseñara un valor que no guarda.
 * Quién manda para mostrar lo decide `GET /auth/me`.
 */
export interface AccountProfileDto {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
}

export function toAccountProfile(user: User): AccountProfileDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString() ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    photoUrl: user.photoUrl ?? null,
  };
}

/**
 * Datos que el titular puede rectificar por su cuenta.
 *
 * **El correo no está aquí a propósito**: es la identidad de acceso, y
 * cambiarlo sin re-verificar la dirección nueva convertiría una sesión robada
 * en una toma de la cuenta. Se cambia desde el back-office.
 */
export class UpdateAccountProfileDto {
  @ApiPropertyOptional({ example: 'Oscar' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ruiz' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: '3312345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Coordinador de soporte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual, para re-autenticar.' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NuevaClave#123' })
  @IsString()
  @MaxLength(200)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword!: string;
}
