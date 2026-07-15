import { ApiProperty } from '@nestjs/swagger';
import {
  IsJWT,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '@/common/utils/password-policy';

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'Token del magic link.' })
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio.' })
  @IsJWT({ message: 'El token no tiene un formato válido.' })
  token!: string;

  @ApiProperty({ example: 'NuevaClave#123' })
  @IsString()
  @MaxLength(200)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Confirma la nueva contraseña.' })
  confirmPassword!: string;
}
