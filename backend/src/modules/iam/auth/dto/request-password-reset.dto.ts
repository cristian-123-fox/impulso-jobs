import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'persona@empresa.com' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255)
  email!: string;
}
