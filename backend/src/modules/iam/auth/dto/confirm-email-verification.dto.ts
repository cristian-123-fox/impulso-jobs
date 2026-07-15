import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

/** Token recibido como query param en `GET /auth/email-verification/confirm`. */
export class ConfirmEmailVerificationDto {
  @ApiProperty({ description: 'Token del magic link de verificación.' })
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio.' })
  @IsJWT({ message: 'El token no tiene un formato válido.' })
  token!: string;
}
