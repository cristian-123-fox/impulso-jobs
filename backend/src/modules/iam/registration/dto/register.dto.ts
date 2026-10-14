import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
import { AcceptedDocumentDto } from '@/modules/legal/dto/record-consent.dto';
import { RegisterCompanyDto } from '@/modules/iam/registration/dto/register-company.dto';
import { RegisterCandidateDto } from '@/modules/iam/registration/dto/register-candidate.dto';

export type AccountType = 'company' | 'candidate';

const toLower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Lo que la persona acepta al registrarse.
 *
 * Es una **lista de documentos** y no campos sueltos (`termsAccepted`,
 * `privacyAccepted`…) por dos razones: el front decide qué casillas mostró —un
 * candidato ve la de cesión de imagen, una empresa no— y añadir un documento
 * nuevo no debería obligar a tocar este DTO, el use-case y el front a la vez.
 *
 * Las **versiones** viajan desde el cliente y no se calculan aquí: el front dice
 * qué texto le enseñó y `RecordConsentUseCase` lo contrasta contra
 * `legal_documents`. Si la calculara el servidor, un desfase de despliegue
 * guardaría una aceptación sobre un texto que el usuario nunca vio.
 *
 * Que `TERMS` y `PRIVACY` con `granted: true` sea obligatorio lo valida
 * `RegisterUseCase`, no el decorador: hace falta un mensaje que nombre el
 * documento que falta y una comprobación cruzada entre los elementos de la
 * lista.
 */
export class RegisterLegalDto {
  @ApiProperty({
    type: [AcceptedDocumentDto],
    description:
      'Documentos aceptados con la versión mostrada. `TERMS` y `PRIVACY` con ' +
      '`granted: true` son obligatorios; el resto depende de las casillas que ' +
      'el formulario haya presentado.',
    example: [
      { code: 'TERMS', version: '1.0.0', granted: true },
      { code: 'PRIVACY', version: '1.0.0', granted: true },
      { code: 'MARKETING', version: '1.0.0', granted: false },
    ],
  })
  @IsDefined({
    message: 'Falta aceptar los términos y el aviso de privacidad.',
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AcceptedDocumentDto)
  documents!: AcceptedDocumentDto[];
}

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

  @ApiProperty({ type: RegisterLegalDto })
  @IsDefined({
    message: 'Falta aceptar los términos y el aviso de privacidad.',
  })
  @ValidateNested()
  @Type(() => RegisterLegalDto)
  legal!: RegisterLegalDto;

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
