import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RegisterLegalDto } from '@/modules/iam/registration/dto/register.dto';

export class GoogleLoginDto {
  @ApiProperty({
    description:
      'ID token (credential) que Google Identity Services devuelve en el navegador.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij... ',
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;

  /**
   * Documentos aceptados en la pantalla de login.
   *
   * `POST /auth/google` **crea la cuenta de candidato si no existe**, así que
   * sin esto habría una vía de alta que esquivaría el consentimiento del
   * registro — y además guardaría una fotografía de Google
   * (`identity.picture`) sin que nadie autorizara el uso de esa imagen. Por eso
   * el campo es obligatorio: el formulario de login muestra las mismas casillas
   * que el de registro.
   *
   * Se acepta en un login de una cuenta ya existente que no mande nada: sólo
   * se valida cuando se va a crear la cuenta, que es donde hay consentimiento
   * que recabar.
   */
  @ApiPropertyOptional({ type: RegisterLegalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterLegalDto)
  legal?: RegisterLegalDto;
}
