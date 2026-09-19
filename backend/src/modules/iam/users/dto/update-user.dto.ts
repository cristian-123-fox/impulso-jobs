import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
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
import { COUNTRY_CODES } from '@/common/catalogs/countries';
import { CURP_REGEX } from '@/common/utils/mx-identifiers';
import { DOCUMENT_TYPES } from '@/modules/candidates/enums/document-type.enum';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const toUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

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

  /** País emisor del documento. Si no viene, el de residencia del perfil. */
  @ApiPropertyOptional({ enum: [...COUNTRY_CODES] })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], {
    message: 'El país del documento no está disponible.',
  })
  documentCountry?: string;

  @ApiPropertyOptional({ enum: [...DOCUMENT_TYPES] })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...DOCUMENT_TYPES], { message: 'El tipo de documento no es válido.' })
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

  /** País de residencia. Manda sobre `state`: la lista depende de él. */
  @ApiPropertyOptional({ enum: [...COUNTRY_CODES] })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], { message: 'El país no está disponible.' })
  country?: string;

  /**
   * Código de la subdivisión. **Hasta T36 esto prometía en Swagger una lista
   * cerrada de estados mexicanos y el validador era `@IsString()` a secas**: la
   * documentación decía una cosa y el código no comprobaba nada. Ahora la
   * comprobación real la hace el caso de uso contra el país del perfil
   * (`isValidSubdivision`), porque la lista válida depende de otro campo.
   */
  @ApiPropertyOptional({ example: 'JAL' })
  @IsOptional()
  @Transform(toUpper)
  @IsString()
  @MaxLength(10)
  state?: string;

  @ApiPropertyOptional({ example: 'Zapopan' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional({ example: '3312345678' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;

  @ApiPropertyOptional({ enum: [...COUNTRY_CODES] })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], {
    message: 'El país del teléfono no está disponible.',
  })
  phoneCountry?: string;
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

  /**
   * Identidad de la persona. Para un ADMIN es el único sitio donde vive su
   * nombre; en candidatos y empresas el nombre para mostrar sigue saliendo
   * de su perfil, y esto queda como dato de contacto de la cuenta.
   */
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
  @MaxLength(25)
  phone?: string;

  @ApiPropertyOptional({ enum: [...COUNTRY_CODES], default: 'MX' })
  @IsOptional()
  @Transform(toUpper)
  @IsIn([...COUNTRY_CODES], {
    message: 'El país del teléfono no está disponible.',
  })
  phoneCountry?: string;

  @ApiPropertyOptional({ example: 'Coordinador de soporte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

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
