import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import {
  BillingPeriod,
  FeatureValueType,
  PaymentMethod,
  PaymentProvider,
  PlanType,
} from '@/modules/billing/enums/billing.enums';

const MAX_PRICE = 1_000_000;

export class SavePlanDto {
  @ApiProperty({ example: 'ALTA' })
  @IsString()
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message: 'El código debe ser mayúsculas, números o guion bajo.',
  })
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType, { message: 'El tipo de plan no es válido.' })
  planType!: PlanType;

  @ApiProperty({ description: 'Precio SIN IVA, en pesos.' })
  @Type(() => Number)
  @Min(0)
  @Max(MAX_PRICE)
  basePrice!: number;

  @ApiPropertyOptional({ description: 'Días de publicación (pago único).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  validityDays?: number;

  @ApiProperty({ enum: BillingPeriod })
  @IsEnum(BillingPeriod, { message: 'El periodo de cobro no es válido.' })
  billingPeriod!: BillingPeriod;

  @ApiPropertyOptional({
    description: 'Publicaciones incluidas (suscripción).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  postingQuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ChangePlanStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class SavePlanFeatureDto {
  @ApiProperty({ example: 'talent_db_access' })
  @IsString()
  @Matches(/^[a-z0-9_]{2,60}$/, {
    message: 'El código debe ser minúsculas, números o guion bajo.',
  })
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FeatureValueType })
  @IsEnum(FeatureValueType, { message: 'El tipo de valor no es válido.' })
  valueType!: FeatureValueType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PlanFeatureValueDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  featureCode!: string;

  @ApiProperty()
  @IsBoolean()
  isIncluded!: boolean;

  @ApiPropertyOptional({
    description: 'Valor para beneficios numéricos/texto. "-1" = ilimitado.',
  })
  @IsOptional()
  @IsString()
  value?: string;
}

export class SetPlanFeaturesDto {
  @ApiProperty({ type: [PlanFeatureValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureValueDto)
  features!: PlanFeatureValueDto[];
}

export class CreatePromotionDto {
  @ApiPropertyOptional({ description: 'Vacante a promocionar.' })
  @IsOptional()
  @IsUUID()
  vacancyId?: string;

  @ApiPropertyOptional({ description: 'Plan por publicación a aplicar.' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    description: 'Usar un crédito de la suscripción activa en vez de pagar.',
  })
  @IsOptional()
  @IsBoolean()
  useSubscriptionCredit?: boolean;
}

export class StartCheckoutDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
  method!: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.MANUAL,
    description: '`stripe` = pago en línea; `manual` = solicitud de pago.',
  })
  @IsOptional()
  @IsEnum(PaymentProvider, { message: 'El medio de pago no es válido.' })
  provider?: PaymentProvider;

  @ApiPropertyOptional({ description: 'Meses sin intereses (solo MSI).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan de tipo suscripción anual.' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
  method!: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.MANUAL,
    description: '`stripe` = pago en línea; `manual` = solicitud de pago.',
  })
  @IsOptional()
  @IsEnum(PaymentProvider, { message: 'El medio de pago no es válido.' })
  provider?: PaymentProvider;

  /**
   * Aceptación expresa del cobro recurrente (art. 76 Bis fr. VIII y IX LFPC).
   * Obligatoria cuando la suscripción se cobra con tarjeta vía Stripe; con la
   * solicitud de pago no hay cobro automático, así que no aplica.
   */
  @ApiPropertyOptional({
    description:
      'Aceptación expresa de la renovación automática. Obligatoria con Stripe.',
  })
  @IsOptional()
  @IsBoolean()
  recurringConsent?: boolean;
}

/**
 * Confirmación manual de un cobro. Es el equivalente del webhook mientras no
 * exista la pasarela: mismo camino, misma idempotencia.
 */
export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Referencia devuelta al abrir el cobro.' })
  @IsString()
  @IsNotEmpty()
  externalReference!: string;

  @ApiPropertyOptional({
    description: 'Id del evento, para la idempotencia. Se genera si falta.',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ description: 'false para simular un pago fallido.' })
  @IsOptional()
  @IsBoolean()
  succeeded?: boolean;
}

export class ListPromotionsQueryDto extends PaginationQueryDto {}

export class PromotionSummaryDto {
  subscription: {
    id: string | null;
    planId: string | null;
    planName: string | null;
    status: string | null;
    startsAt: Date | null;
    currentPeriodEnd: Date | null;
    autoRenew: boolean;
    postingCredits: number;
    usedPostingCredits: number;
    availableCredits: number;
    promotionDurationDays: number | null;
  } | null;
  promotionsIncluded: number;
  promotionsUsed: number;
  promotionsAvailable: number;
  promotionDurationDays: number | null;
}
