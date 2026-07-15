import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token a revocar.' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio.' })
  @IsJWT({ message: 'El refresh token no tiene un formato válido.' })
  refreshToken!: string;
}
