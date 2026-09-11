import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: 'Cambio en tu postulación' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Tu postulación ha cambiado de estado.' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ example: '/candidato/postulaciones' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}
