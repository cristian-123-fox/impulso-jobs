import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RegisterLegalDto } from '@/modules/iam/registration/dto/register.dto';

/** Pestaña elegida en el login: candidato o empresa. */
export enum LoginAccountType {
  CANDIDATE = 'candidate',
  COMPANY = 'company',
}

export class LoginDto {
  @ApiProperty({ example: 'persona@empresa.com' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Secreta#123' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(200)
  password!: string;

  /**
   * Pestaña desde la que se intenta entrar. El backend comprueba que coincida
   * con el rol real de la cuenta: así el selector Candidato/Empresa no es sólo
   * cosmético y una cuenta de empresa no entra por la pestaña de candidato.
   * Los ADMIN se aceptan desde cualquiera de las dos.
   */
  @ApiPropertyOptional({ enum: LoginAccountType })
  @IsOptional()
  @IsEnum(LoginAccountType, {
    message: 'El tipo de cuenta no es válido.',
  })
  accountType?: LoginAccountType;

  /**
   * Documentos aceptados, sólo cuando el backend los exige.
   *
   * En un login normal no se manda nada: si la versión vigente de los
   * documentos obligatorios es la que esta persona ya aceptó, entrar no genera
   * ninguna fila nueva. Si se publicó una versión nueva, el backend responde
   * `LEGAL_VERSION_OUTDATED` y el formulario lo repite con las casillas puestas
   * sobre la versión que ahora está vigente.
   */
  @ApiPropertyOptional({ type: RegisterLegalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterLegalDto)
  legal?: RegisterLegalDto;
}
