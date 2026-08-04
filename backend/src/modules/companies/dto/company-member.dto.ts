import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UserStatus } from '@/common/types/user-status.enum';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { User } from '@/modules/iam/users/entities/user.entity';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Alta de un miembro. Dos modos excluyentes: vincular una cuenta que ya existe
 * (`userId`) o crear una nueva cuenta EMPLOYER (`email` + `password`).
 */
export class AddCompanyMemberDto {
  @ApiPropertyOptional({ description: 'Cuenta existente a vincular.' })
  @IsOptional()
  @IsUUID('4', { message: 'El usuario seleccionado no es válido.' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Correo de la cuenta nueva.' })
  @ValidateIf((o: AddCompanyMemberDto) => !o.userId)
  @Transform(toLower)
  @IsEmail({}, { message: 'Indica una cuenta existente o un correo válido.' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Contraseña de la cuenta nueva.' })
  @ValidateIf((o: AddCompanyMemberDto) => !o.userId)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password?: string;

  @ApiProperty({ enum: CompanyMemberRole })
  @IsEnum(CompanyMemberRole, { message: 'El rol interno no es válido.' })
  role!: CompanyMemberRole;
}

export class UpdateCompanyMemberRoleDto {
  @ApiProperty({ enum: CompanyMemberRole })
  @IsEnum(CompanyMemberRole, { message: 'El rol interno no es válido.' })
  role!: CompanyMemberRole;
}

/** Miembro del equipo de una empresa, con el estado de su cuenta. */
export interface CompanyMemberResponseDto {
  userId: string;
  email: string;
  /** Rol dentro de la empresa (`company_users.role`). */
  companyRole: CompanyMemberRole;
  /** Estado de la cuenta de plataforma. */
  status: UserStatus;
  emailVerified: boolean;
  lastLogin: string | null;
  joinedAt: string;
}

export function toCompanyMemberResponse(
  member: CompanyUser,
  user: User,
): CompanyMemberResponseDto {
  return {
    userId: user.id,
    email: user.email,
    companyRole: member.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    lastLogin: user.lastLogin?.toISOString() ?? null,
    joinedAt: member.createdAt.toISOString(),
  };
}
