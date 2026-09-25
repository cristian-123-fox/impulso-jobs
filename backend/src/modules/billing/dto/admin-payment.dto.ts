import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SortableQueryDto } from '@/common/dto/sortable-query.dto';
import { PaymentStatus } from '@/modules/billing/enums/billing.enums';
import { OrderResponseDto } from '@/modules/billing/dto/billing-response.dto';

/** Lista blanca de columnas ordenables. Ver `buildOrder`. */
export const ADMIN_PAYMENT_SORT_COLUMNS = {
  createdAt: 'createdAt',
  total: 'total',
  paymentStatus: 'paymentStatus',
  paidAt: 'paidAt',
} as const;

export const ADMIN_PAYMENT_SORT_KEYS = Object.keys(
  ADMIN_PAYMENT_SORT_COLUMNS,
) as (keyof typeof ADMIN_PAYMENT_SORT_COLUMNS)[];

export type AdminPaymentSortKey = keyof typeof ADMIN_PAYMENT_SORT_COLUMNS;

/**
 * `OPEN` agrupa `PENDING` y `AWAITING_PAYMENT`: la cola de lo que falta por
 * confirmar. Los demás valores filtran por un estado exacto.
 */
export const ADMIN_PAYMENT_STATUS_FILTERS = [
  'OPEN',
  ...Object.values(PaymentStatus),
] as const;

export type AdminPaymentStatusFilter =
  (typeof ADMIN_PAYMENT_STATUS_FILTERS)[number];

export class ListAdminPaymentsQueryDto extends SortableQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_PAYMENT_STATUS_FILTERS })
  @IsOptional()
  @IsIn(ADMIN_PAYMENT_STATUS_FILTERS, { message: 'El estado no es válido.' })
  status?: AdminPaymentStatusFilter;

  @ApiPropertyOptional({ enum: ADMIN_PAYMENT_SORT_KEYS })
  @IsOptional()
  @IsIn(ADMIN_PAYMENT_SORT_KEYS, {
    message: 'La columna de orden no es válida.',
  })
  sortBy?: AdminPaymentSortKey;
}

export class RejectPaymentDto {
  @ApiPropertyOptional({
    description: 'Motivo del rechazo; se le muestra a la empresa.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300, {
    message: 'El motivo no puede superar los 300 caracteres.',
  })
  reason?: string;
}

/** Qué compra la orden: una promoción de vacante o la suscripción. */
export type AdminPaymentKind = 'PROMOTION' | 'SUBSCRIPTION';

/** Una orden de cobro vista desde el back-office. */
export interface AdminPaymentResponseDto extends OrderResponseDto {
  kind: AdminPaymentKind;
  companyId: string;
  /** Nulo si la empresa ya no existe. */
  companyName: string | null;
  planName: string | null;
  /** Sólo en promociones. */
  vacancyId: string | null;
  vacancyTitle: string | null;
  createdAt: string;
}
