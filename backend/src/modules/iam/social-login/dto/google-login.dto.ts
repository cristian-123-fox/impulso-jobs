import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description:
      'ID token (credential) que Google Identity Services devuelve en el navegador.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij... ',
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
