import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido en el login.' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio.' })
  @IsJWT({ message: 'El refresh token no tiene un formato válido.' })
  refreshToken!: string;
}
