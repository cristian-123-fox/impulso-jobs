import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RegisterLegalDto } from '@/modules/iam/registration/dto/register.dto';

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
