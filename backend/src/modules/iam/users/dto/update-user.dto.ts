import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { MX_STATE_CODES } from '@/common/catalogs/mx-states';
import { CURP_REGEX } from '@/common/utils/mx-identifiers';
import { DOCUMENT_TYPES } from '@/modules/candidates/enums/document-type.enum';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Datos del perfil del candidato editables desde el back-office. */
export class UpdateCandidateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'GARC850101MVZRRL04' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(CURP_REGEX, {
    message: 'La CURP no es válida.',
  })
  curp?: string;

  @ApiPropertyOptional({ example: '1985-01-15' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Ingeniero en Sistemas' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  professionalTitle?: string;

  @ApiPropertyOptional({ enum: MX_STATE_CODES })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Zapopan' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional({ example: '3312345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

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

  /** Notas internas del administrador sobre esta cuenta. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  /** Datos del perfil del candidato (solo para rol CANDIDATE). */
  @ApiPropertyOptional({ type: UpdateCandidateProfileDto })
  @ValidateIf((o: UpdateUserDto) => o.role === Role.CANDIDATE)
  @ValidateNested()
  @Type(() => UpdateCandidateProfileDto)
  candidateProfile?: UpdateCandidateProfileDto;

  /** Empresa a la que se vincula el empleador (solo para rol EMPLOYER). */
  @ApiPropertyOptional()
  @ValidateIf((o: UpdateUserDto) => o.role === Role.EMPLOYER)
  @IsUUID('4', { message: 'La empresa no es válida.' })
  companyId?: string;

  @ApiPropertyOptional({ enum: CompanyMemberRole })
  @IsOptional()
  @IsEnum(CompanyMemberRole, { message: 'El rol en la empresa no es válido.' })
  companyRole?: CompanyMemberRole;
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
