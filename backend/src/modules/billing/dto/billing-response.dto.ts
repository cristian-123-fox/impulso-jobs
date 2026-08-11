import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import {
  MethodAvailability,
  PriceBreakdown,
} from '@/modules/billing/services/pricing.service';

export interface PlanFeatureResponseDto {
  code: string;
  name: string;
  description: string | null;
  valueType: string;
  sortOrder: number;
}

/** Un beneficio tal como aplica a un plan concreto. */
export interface PlanFeatureValueResponseDto {
  code: string;
  name: string;
  valueType: string;
  isIncluded: boolean;
  value: string | null;
}

export interface PlanResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  planType: string;
  billingPeriod: string;
  validityDays: number | null;
  postingQuota: number | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Desglose con IVA, listo para pintar la tarjeta de precios. */
  price: PriceBreakdown;
  /** Métodos aceptables para este importe (OXXO puede quedar fuera). */
  paymentMethods: MethodAvailability[];
  features: PlanFeatureValueResponseDto[];
}

export interface PromotionResponseDto {
  id: string;
  vacancyId: string;
  planId: string;
  planName: string | null;
  status: string;
  pricePaid: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  order: OrderResponseDto | null;
}

export interface SubscriptionResponseDto {
  id: string;
  planId: string;
  planName: string | null;
  status: string;
  startsAt: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  order: OrderResponseDto | null;
}

export interface OrderResponseDto {
  id: string;
  provider: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  installments: number;
  externalReference: string | null;
  /** Datos del vale de OXXO, cuando el pago está pendiente en tienda. */
  voucherUrl: string | null;
  voucherReference: string | null;
  voucherExpiresAt: string | null;
  cfdiUuid: string | null;
  paidAt: string | null;
}

/** Lo que devuelve abrir un cobro: a dónde ir y en qué estado quedó. */
export interface CheckoutResponseDto {
  orderId: string;
  checkoutUrl: string | null;
  order: OrderResponseDto;
}

function amount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toPlanFeatureResponse(
  feature: PlanFeature,
): PlanFeatureResponseDto {
  return {
    code: feature.code,
    name: feature.name,
    description: feature.description ?? null,
    valueType: feature.valueType,
    sortOrder: feature.sortOrder,
  };
}

export function toPlanResponse(
  plan: Plan,
  price: PriceBreakdown,
  paymentMethods: MethodAvailability[],
  catalog: PlanFeature[],
  values: PlanFeatureValue[],
): PlanResponseDto {
  const byCode = new Map(values.map((value) => [value.featureCode, value]));

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description ?? null,
    planType: plan.planType,
    billingPeriod: plan.billingPeriod,
    validityDays: plan.validityDays ?? null,
    postingQuota: plan.postingQuota ?? null,
    isPopular: plan.isPopular,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    price,
    paymentMethods,
    // Se recorre el catálogo, no los valores: así la matriz sale completa y
    // los beneficios no contratados aparecen explícitamente como excluidos.
    features: catalog.map((feature) => {
      const value = byCode.get(feature.code);
      return {
        code: feature.code,
        name: feature.name,
        valueType: feature.valueType,
        isIncluded: value?.isIncluded ?? false,
        value: value?.value ?? null,
      };
    }),
  };
}

export function toOrderResponse(order: PromotionOrder): OrderResponseDto {
  return {
    id: order.id,
    provider: order.provider,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: amount(order.subtotal),
    taxAmount: amount(order.taxAmount),
    total: amount(order.total),
    currency: order.currency,
    installments: order.installments,
    externalReference: order.externalReference ?? null,
    voucherUrl: order.voucherUrl ?? null,
    voucherReference: order.voucherReference ?? null,
    voucherExpiresAt: order.voucherExpiresAt?.toISOString() ?? null,
    cfdiUuid: order.cfdiUuid ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
  };
}

export function toPromotionResponse(
  promotion: VacancyPromotion,
  planName: string | null,
  order: PromotionOrder | null,
): PromotionResponseDto {
  return {
    id: promotion.id,
    vacancyId: promotion.vacancyId,
    planId: promotion.planId,
    planName,
    status: promotion.status,
    pricePaid: amount(promotion.pricePaid),
    currency: promotion.currency,
    startsAt: promotion.startsAt?.toISOString() ?? null,
    endsAt: promotion.endsAt?.toISOString() ?? null,
    createdAt: promotion.createdAt.toISOString(),
    order: order ? toOrderResponse(order) : null,
  };
}

export function toSubscriptionResponse(
  subscription: CompanySubscription,
  planName: string | null,
  order: PromotionOrder | null,
): SubscriptionResponseDto {
  return {
    id: subscription.id,
    planId: subscription.planId,
    planName,
    status: subscription.status,
    startsAt: subscription.startsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    autoRenew: subscription.autoRenew,
    order: order ? toOrderResponse(order) : null,
  };
}
