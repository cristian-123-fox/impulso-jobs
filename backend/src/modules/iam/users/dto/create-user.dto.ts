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
import { RegisterCandidateDto } from '@/modules/iam/registration/dto/register-candidate.dto';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Alta de usuario desde el back-office. A diferencia del registro público
 * (HU-005/006), el administrador fija el rol y la cuenta nace verificada por
 * defecto, para que sirva de inmediato en pruebas sin depender del correo.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'persona@empresa.com' })
  @Transform(toLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Secreta#123' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: 'El rol no es válido.' })
  role!: Role;

  /**
   * Identidad de la persona. Obligatoria para ADMIN: es su único nombre y sin
   * ella la cuenta nace anónima en listados y auditoría, que es justo el
   * agujero que esto viene a tapar. Un candidato lo trae en `candidate` y una
   * empresa hereda el suyo, así que ahí es opcional.
   */
  @ApiPropertyOptional({ example: 'Oscar' })
  @ValidateIf((o: CreateUserDto) => o.role === Role.ADMIN)
  @IsDefined({ message: 'El nombre es obligatorio.' })
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ruiz' })
  @ValidateIf((o: CreateUserDto) => o.role === Role.ADMIN)
  @IsDefined({ message: 'Los apellidos son obligatorios.' })
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

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado no es válido.' })
  status?: UserStatus;

  /** Por defecto `true`: sin SMTP, una cuenta sin verificar no podría entrar. */
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  /** Empresa a la que se vincula el empleador (obligatorio para EMPLOYER). */
  @ApiPropertyOptional()
  @ValidateIf((o: CreateUserDto) => o.role === Role.EMPLOYER)
  @IsDefined({ message: 'Selecciona la empresa del usuario empleador.' })
  @IsUUID('4', { message: 'La empresa no es válida.' })
  companyId?: string;

  @ApiPropertyOptional({ enum: CompanyMemberRole })
  @IsOptional()
  @IsEnum(CompanyMemberRole, { message: 'El rol en la empresa no es válido.' })
  companyRole?: CompanyMemberRole;

  /** Roles personalizados adicionales (los base van en `role`). */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Alguno de los roles no es válido.' })
  extraRoleIds?: string[];

  @ApiPropertyOptional({ type: RegisterCandidateDto })
  @ValidateIf((o: CreateUserDto) => o.role === Role.CANDIDATE)
  @IsDefined({ message: 'Faltan los datos del candidato.' })
  @ValidateNested()
  @Type(() => RegisterCandidateDto)
  candidate?: RegisterCandidateDto;
}
