import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description:
      'Contraseña actual. Se re-autentica al titular antes de una baja que invalida todas sus sesiones.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirma tu contraseña para dar de baja la cuenta.' })
  @MaxLength(128)
  password!: string;
}
