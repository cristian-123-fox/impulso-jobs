import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CheckoutResponseDto,
  PromotionResponseDto,
  toOrderResponse,
  toPromotionResponse,
} from '@/modules/billing/dto/billing-response.dto';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import {
  BILLING_CURRENCY,
  PaymentMethod,
  PaymentStatus,
  PlanType,
  PromotionStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import {
  type PaymentProviderPort,
  PAYMENT_PROVIDER,
} from '@/modules/billing/services/payment-provider.port';
import { PricingService } from '@/modules/billing/services/pricing.service';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

/**
 * Compra de un plan por publicación para una vacante propia (HU-014).
 *
 * El flujo tiene dos pasos a propósito: **crear** la promoción congela el
 * precio y reserva la vacante, y **checkout** abre el cobro. Así una promoción
 * pendiente de pago ya bloquea que se compre otra para la misma vacante.
 */
@Injectable()
export class VacancyPromotionUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
    private readonly pricing: PricingService,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async create(
    vacancyId: string,
    planId: string,
    actor: BillingActor,
  ): Promise<PromotionResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(
      vacancyId,
      company.id,
    );

    if (vacancy.status === VacancyStatus.CLOSED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_CLOSED,
        'No se puede promocionar una vacante cerrada.',
      );
    }

    const plan = await this.plans.findById(planId);
    if (!plan) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PLAN_NOT_FOUND,
        'El plan no existe.',
      );
    }
    if (!plan.isActive) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PLAN_INACTIVE,
        'Ese plan no está disponible.',
      );
    }
    if (plan.planType !== PlanType.PER_PUBLICATION) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PLAN_WRONG_TYPE,
        'Ese plan es una suscripción de empresa, no se aplica a una vacante.',
      );
    }

    const live = await this.billing.findLivePromotionByVacancy(vacancy.id);
    if (live) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PROMOTION_ALREADY_EXISTS,
        live.status === PromotionStatus.ACTIVE
          ? 'Esta vacante ya tiene una promoción activa.'
          : 'Esta vacante ya tiene una promoción pendiente de pago.',
      );
    }

    const promotion = new VacancyPromotion();
    promotion.vacancyId = vacancy.id;
    promotion.planId = plan.id;
    promotion.companyId = company.id;
    promotion.purchasedBy = actor.userId;
    promotion.status = PromotionStatus.PENDING_PAYMENT;
    // Precio congelado: si el plan sube mañana, esta compra mantiene el suyo.
    promotion.pricePaid = plan.basePrice;
    promotion.currency = plan.currency || BILLING_CURRENCY;

    const saved = await this.billing.savePromotion(promotion);

    await this.audit.record({
      action: 'promotions.create',
      actorUserId: actor.userId,
      entity: 'vacancy_promotion',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        vacancyId: vacancy.id,
        planCode: plan.code,
        pricePaid: saved.pricePaid,
      },
    });

    return toPromotionResponse(saved, plan.name, null);
  }

  /** Abre el cobro de una promoción pendiente y crea su orden. */
  async checkout(
    promotionId: string,
    method: PaymentMethod,
    installments: number,
    actor: BillingActor,
  ): Promise<CheckoutResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const promotion = await this.billing.findPromotionByIdAndCompany(
      promotionId,
      company.id,
    );
    if (!promotion) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PROMOTION_NOT_FOUND,
        'La promoción no existe.',
      );
    }
    if (promotion.status !== PromotionStatus.PENDING_PAYMENT) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PROMOTION_NOT_PAYABLE,
        'Esta promoción ya no está pendiente de pago.',
      );
    }

    const plan = await this.plans.findById(promotion.planId);
    if (!plan) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PLAN_NOT_FOUND,
        'El plan de la promoción ya no existe.',
      );
    }

    // El precio se recalcula sobre el congelado, no sobre el plan actual.
    const price = this.pricing.breakdown({
      ...plan,
      basePrice: promotion.pricePaid,
    } as typeof plan);

    const availability = this.pricing.isMethodAvailable(
      method,
      price.total,
      false,
    );
    if (!availability.available) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE,
        availability.reason ?? 'Ese método de pago no está disponible.',
      );
    }

    const order = new PromotionOrder();
    order.promotionId = promotion.id;
    order.companyId = company.id;
    order.provider = this.payments.name;
    order.paymentMethod = method;
    order.paymentStatus = PaymentStatus.PENDING;
    order.subtotal = price.subtotal.toFixed(2);
    order.taxAmount = price.taxAmount.toFixed(2);
    order.total = price.total.toFixed(2);
    order.currency = price.currency;
    order.installments = method === PaymentMethod.MSI ? installments : 1;

    const stored = await this.billing.saveOrder(order);

    const checkout = await this.payments.createCheckout({
      orderId: stored.id,
      companyId: company.id,
      concept: `${plan.name} · vacante ${promotion.vacancyId}`,
      total: price.total,
      currency: price.currency,
      method,
      installments: stored.installments,
      recurring: false,
      providerPriceId: plan.providerPriceId,
    });

    stored.externalReference = checkout.externalReference;
    stored.paymentStatus = checkout.status;
    stored.voucherUrl = checkout.voucher?.url ?? null;
    stored.voucherReference = checkout.voucher?.reference ?? null;
    stored.voucherExpiresAt = checkout.voucher?.expiresAt ?? null;
    const withReference = await this.billing.saveOrder(stored);

    await this.audit.record({
      action: 'promotions.checkout',
      actorUserId: actor.userId,
      entity: 'promotion_order',
      entityId: withReference.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        promotionId: promotion.id,
        method,
        total: withReference.total,
        provider: withReference.provider,
      },
    });

    return {
      orderId: withReference.id,
      checkoutUrl: checkout.checkoutUrl,
      order: toOrderResponse(withReference),
    };
  }

  async list(
    actor: BillingActor,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<PromotionResponseDto>> {
    const company = await this.ownership.requireCompany(actor.userId);
    const [rows, total] = await this.billing.findAndCountPromotionsByCompany({
      companyId: company.id,
      page,
      limit,
    });

    const items = await this.decorate(rows);
    return toPaginated(items, total, page, limit);
  }

  /** Promoción vigente de una vacante concreta, si la tiene. */
  async getForVacancy(
    vacancyId: string,
    actor: BillingActor,
  ): Promise<PromotionResponseDto | null> {
    const company = await this.ownership.requireCompany(actor.userId);
    await this.ownership.requireOwnVacancy(vacancyId, company.id);

    const promotion = await this.billing.findLivePromotionByVacancy(vacancyId);
    if (!promotion) return null;

    const [item] = await this.decorate([promotion]);
    return item;
  }

  private async decorate(
    rows: VacancyPromotion[],
  ): Promise<PromotionResponseDto[]> {
    if (rows.length === 0) return [];

    return Promise.all(
      rows.map(async (promotion) => {
        const [plan, orders] = await Promise.all([
          this.plans.findById(promotion.planId),
          this.billing.findOrdersByPromotionId(promotion.id),
        ]);
        return toPromotionResponse(
          promotion,
          plan?.name ?? null,
          orders[0] ?? null,
        );
      }),
    );
  }
}
