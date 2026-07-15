import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsEmail,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';
import { RegisterCompanyDto } from '@/modules/iam/registration/dto/register-company.dto';
import { RegisterCandidateDto } from '@/modules/iam/registration/dto/register-candidate.dto';

export type AccountType = 'company' | 'candidate';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Registro único: discrimina por `accountType` y valida el bloque correcto. */
export class RegisterDto {
  @ApiProperty({ enum: ['company', 'candidate'] })
  @IsIn(['company', 'candidate'], {
    message: 'El tipo de cuenta no es válido.',
  })
  accountType!: AccountType;

  @ApiProperty({ example: 'persona@empresa.com' })
  @Transform(toLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Secreta#123' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @ApiPropertyOptional({ type: RegisterCompanyDto })
  @ValidateIf((o: RegisterDto) => o.accountType === 'company')
  @IsDefined({ message: 'Faltan los datos de la empresa.' })
  @ValidateNested()
  @Type(() => RegisterCompanyDto)
  company?: RegisterCompanyDto;

  @ApiPropertyOptional({ type: RegisterCandidateDto })
  @ValidateIf((o: RegisterDto) => o.accountType === 'candidate')
  @IsDefined({ message: 'Faltan los datos del candidato.' })
  @ValidateNested()
  @Type(() => RegisterCandidateDto)
  candidate?: RegisterCandidateDto;
}
