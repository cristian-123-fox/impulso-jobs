import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignUserRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El roleId es obligatorio.' })
  roleId!: string;
}
