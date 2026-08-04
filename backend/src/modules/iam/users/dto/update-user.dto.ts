import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Edición administrativa de una cuenta. Todo es opcional (patch parcial). */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol no es válido.' })
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado no es válido.' })
  status?: UserStatus;

  /** Restablece la contraseña e invalida las sesiones vigentes. */
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

/** Cambio de estado aislado (bloquear / reactivar). Permiso `users.block`. */
export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'El estado no es válido.' })
  status!: UserStatus;
}

/**
 * Conjunto completo de roles *adicionales* (personalizados) de la cuenta. Los
 * roles base van en `role`; enviarlos aquí se rechaza.
 */
export class SetUserRolesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Alguno de los roles no es válido.' })
  roleIds!: string[];
}
