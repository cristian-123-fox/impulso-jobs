import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@/common/types/role.enum';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class RefreshResponseDto {
  @ApiProperty()
  accessToken!: string;
}
