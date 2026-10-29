import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

}
