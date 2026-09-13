import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from '@/modules/billing/enums/billing.enums';

const MAX_PRICE = 1_000_000;

/**
 * El motivo es **obligatorio** en las tres acciones (T34 punto 5): un
 * administrador que regala, prorroga o retira un plan está moviendo dinero, y
 * el registro de auditoría sin un porqué no sirve de nada seis meses después.
 */
const REASON_MIN = 5;
const REASON_MAX = 500;

class WithReasonDto {
  @ApiProperty({
    description: 'Por qué se hace el cambio. Queda en auditoría.',
    example: 'Venta cerrada por transferencia, folio 8891.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio.' })
  @MinLength(REASON_MIN, {
    message: `El motivo debe tener al menos ${REASON_MIN} caracteres.`,
  })
  @MaxLength(REASON_MAX)
  reason!: string;
}

/**
 * Asignación (o cambio) del plan de una empresa desde el back-office.
 *
 * El catálogo **no se filtra**: el administrador puede elegir cualquier plan,
 * activo o retirado del escaparate, para poder asignar a un cliente antiguo un
 * plan que ya no se vende. Un plan por publicación también se acepta, con la
 * salvedad documentada en el caso de uso.
 */
export class AssignSubscriptionDto extends WithReasonDto {
  @ApiProperty({ description: 'Plan a asignar. Cualquiera del catálogo.' })
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({
    description:
      'Fin del periodo contratado (ISO). Por defecto, un año desde hoy.',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento no tiene un formato válido.' },
  )
  currentPeriodEnd?: string;

  @ApiPropertyOptional({
    description:
      'Importe SIN IVA que se registra como cobrado. Por defecto, el precio vigente del plan.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(MAX_PRICE)
  amount?: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Cómo se cobró. Por defecto SPEI (transferencia).',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Renovación automática al vencer.' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

/** Prórrogas y ajustes de renovación sobre la suscripción vigente. */
export class UpdateSubscriptionDto extends WithReasonDto {
  @ApiPropertyOptional({ description: 'Nuevo fin de periodo (ISO).' })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento no tiene un formato válido.' },
  )
  currentPeriodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

/**
 * Retiro del plan. Va en el cuerpo de un `DELETE` porque el motivo es
 * obligatorio y no cabe pedirlo por query string.
 */
export class RevokeSubscriptionDto extends WithReasonDto {}
