import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class ValidatePasswordResetDto {
  @ApiProperty({ description: 'Token del magic link.' })
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio.' })
  @IsJWT({ message: 'El token no tiene un formato válido.' })
  token!: string;
}
