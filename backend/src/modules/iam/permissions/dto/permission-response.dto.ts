import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'roles.read' })
  code!: string;

  @ApiProperty({
    example: 'roles',
    description: 'Componente (primer segmento del code).',
  })
  component!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}
