import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El permissionId es obligatorio.' })
  permissionId!: string;
}
