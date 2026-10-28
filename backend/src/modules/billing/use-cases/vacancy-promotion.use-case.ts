import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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
import { Plan } from '@/modules/billing/entities/plan.entity';
import {
  BILLING_CURRENCY,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PlanType,
  PromotionStatus,
  SubscriptionStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import type { CheckoutResult } from '@/modules/billing/services/payment-provider.port';
import { checkoutReturnUrls } from '@/modules/billing/services/checkout-return-urls';
import { PaymentProviderRegistry } from '@/modules/billing/services/payment-provider.registry';
import { PaymentQueueNotifier } from '@/modules/billing/services/payment-queue-notifier.service';
import { PricingService } from '@/modules/billing/services/pricing.service';
import { EntitlementService } from '@/modules/billing/services/entitlement.service';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import type { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VACANCY_REPOSITORY } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { DataSource } from 'typeorm';
import { runInTransaction } from '@/common/utils/transaction.util';
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
    private readonly providers: PaymentProviderRegistry,
    private readonly pricing: PricingService,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
    private readonly paymentQueue: PaymentQueueNotifier,
    private readonly entitlements: EntitlementService,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    vacancyId: string,
    planId: string | undefined,
    useSubscriptionCredit: boolean,
    actor: BillingActor,
  ): Promise<PromotionResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(
      vacancyId,
      company.id,
    );

    if (vacancy.status !== VacancyStatus.ACTIVE) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.VACANCY_INVALID_STATUS_CHANGE,
        'Solo se pueden promocionar vacantes publicadas y activas.',
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

    if (useSubscriptionCredit) {
      let saved: VacancyPromotion | null = null;
      let planName: string | null = null;
      let planCode: string | null = null;

      await runInTransaction(this.dataSource, async (manager) => {
        const subscription = await this.billing.findLiveSubscriptionByCompany(
          company.id,
          new Date(),
          manager,
        );
        if (
          !subscription ||
          subscription.status !== SubscriptionStatus.ACTIVE ||
          (subscription.promotionCredits ?? 0) -
            (subscription.usedPromotionCredits ?? 0) <=
            0
        ) {
          throw new AppException(
            HttpStatus.CONFLICT,
            ErrorCode.PROMOTION_NOT_PAYABLE,
            'No tienes créditos de promoción disponibles en tu suscripción.',
          );
        }

        // Revalidar que no haya promoción viva (control de concurrencia).
        const live = await this.billing.findLivePromotionByVacancy(
          vacancy.id,
          manager,
        );
        if (live) {
          throw new AppException(
            HttpStatus.CONFLICT,
            ErrorCode.PROMOTION_ALREADY_EXISTS,
            'Esta vacante ya tiene una promoción activa.',
          );
        }

        const plan = await this.plans.findById(subscription.planId, manager);
        if (!plan) {
          throw new AppException(
            HttpStatus.NOT_FOUND,
            ErrorCode.PLAN_NOT_FOUND,
            'El plan de la suscripción ya no existe.',
          );
        }

        subscription.usedPromotionCredits =
          (subscription.usedPromotionCredits ?? 0) + 1;
        await this.billing.saveSubscription(subscription, manager);

        const entitlements = await this.entitlements.resolve(plan, manager);
        const days = entitlements.publicationDays ?? plan.validityDays ?? null;
        const startsAt = new Date();
        const endsAt = days === null ? null : this.addDays(startsAt, days);

        if (endsAt && vacancy.expiresAt && endsAt > vacancy.expiresAt) {
          throw new AppException(
            HttpStatus.CONFLICT,
            ErrorCode.PROMOTION_NOT_PAYABLE,
            'La vacante vence antes de completar la duración de la promoción.',
          );
        }

        const promotion = new VacancyPromotion();
        promotion.vacancyId = vacancy.id;
        promotion.planId = plan.id;
        promotion.companyId = company.id;
        promotion.purchasedBy = actor.userId;
        promotion.status = PromotionStatus.ACTIVE;
        promotion.pricePaid = '0';
        promotion.currency = plan.currency || BILLING_CURRENCY;
        promotion.startsAt = startsAt;
        promotion.endsAt = endsAt ?? null;

        await this.entitlements.applyToVacancy(
          vacancy.id,
          plan,
          entitlements,
          startsAt,
          manager,
        );

        saved = await this.billing.savePromotion(promotion, manager);
        planName = plan.name;
        planCode = plan.code;
      });

      const vacancyRecord = await this.vacancies.findById(saved!.vacancyId);

      await this.audit.record({
        action: 'promotions.create_credit',
        actorUserId: actor.userId,
        entity: 'vacancy_promotion',
        entityId: saved!.id,
        ip: actor.ip,
        userAgent: actor.userAgent,
        metadata: { vacancyId: saved!.vacancyId, planCode, credit: true },
      });

      return toPromotionResponse(saved!, planName, null, vacancyRecord?.title ?? null);
    }

    if (!planId) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PLAN_NOT_FOUND,
        'Debes elegir un plan para promocionar la vacante.',
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

    return toPromotionResponse(saved, plan.name, null, vacancy.title ?? null);
  }

  /**
   * Abre el cobro de una promoción pendiente y crea su orden. Se puede llamar
   * otra vez sobre la misma promoción (reintentar tras abandonar el Checkout):
   * las órdenes abiertas anteriores se anulan antes de abrir la nueva.
   */
  async checkout(
    promotionId: string,
    method: PaymentMethod,
    installments: number,
    providerName: PaymentProvider,
    actor: BillingActor,
  ): Promise<CheckoutResponseDto> {
    const provider = this.providers.require(providerName);
    this.providers.assertSupports(provider, method, false);
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

    await this.supersedeOpenOrders(promotion.id);

    const order = new PromotionOrder();
    order.promotionId = promotion.id;
    order.companyId = company.id;
    order.provider = provider.name;
    order.paymentMethod = method;
    order.paymentStatus = PaymentStatus.PENDING;
    order.subtotal = price.subtotal.toFixed(2);
    order.taxAmount = price.taxAmount.toFixed(2);
    order.total = price.total.toFixed(2);
    order.currency = price.currency;
    order.installments = method === PaymentMethod.MSI ? installments : 1;

    const stored = await this.billing.saveOrder(order);

    let checkout: CheckoutResult;
    try {
      checkout = await provider.createCheckout({
        orderId: stored.id,
        companyId: company.id,
        concept: `Promoción ${plan.name} · Impulso Jobs`,
        total: price.total,
        currency: price.currency,
        method,
        installments: stored.installments,
        recurring: false,
        providerPriceId: plan.providerPriceId,
        returnUrls: checkoutReturnUrls(stored.id),
      });
    } catch (error) {
      // Sin sesión en la pasarela la orden no tiene cómo pagarse: se marca
      // fallida para que no aparezca como pendiente en /admin/pagos, y la
      // promoción se libera —las anteriores ya se anularon arriba—, o la
      // vacante quedaría bloqueada con `PROMOTION_ALREADY_EXISTS`.
      stored.paymentStatus = PaymentStatus.FAILED;
      await this.billing.saveOrder(stored);
      promotion.status = PromotionStatus.CANCELLED;
      await this.billing.savePromotion(promotion);
      throw error;
    }

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

    await this.paymentQueue.notifyPending(
      withReference,
      `${company.businessName} · promoción ${plan.name}`,
    );

    return {
      orderId: withReference.id,
      checkoutUrl: checkout.checkoutUrl,
      order: toOrderResponse(withReference),
    };
  }

  /**
   * Anula las órdenes abiertas de la promoción antes de abrir otra. Se marcan
   * fallidas **sin** pasar por `SettlePaymentUseCase`, porque eso cancelaría la
   * promoción entera; y la sesión se expira en la pasarela para que el enlace
   * viejo no se pueda pagar.
   */
  private async supersedeOpenOrders(promotionId: string): Promise<void> {
    const orders = await this.billing.findOrdersByPromotionId(promotionId);
    for (const previous of orders) {
      if (
        previous.paymentStatus !== PaymentStatus.PENDING &&
        previous.paymentStatus !== PaymentStatus.AWAITING_PAYMENT
      ) {
        continue;
      }
      if (previous.externalReference) {
        await this.providers
          .forOrder(previous.provider)
          ?.cancel(previous.externalReference);
      }
      previous.paymentStatus = PaymentStatus.FAILED;
      await this.billing.saveOrder(previous);
    }
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

  /** Resumen de suscripción y cupos de promoción de la empresa. */
  async summary(actor: BillingActor): Promise<any> {
    const company = await this.ownership.requireCompany(actor.userId);
    const subscription = await this.billing.findLiveSubscriptionByCompany(
      company.id,
      new Date(),
    );

    let plan: Plan | null = null;
    if (subscription) {
      plan = await this.plans.findById(subscription.planId);
    }

    const entitlements = plan ? await this.entitlements.resolve(plan) : null;
    const durationDays =
      entitlements?.publicationDays ?? plan?.validityDays ?? null;

    const included = subscription ? (subscription.promotionCredits ?? 0) : 0;
    const used = subscription ? (subscription.usedPromotionCredits ?? 0) : 0;

    const [rows] = await this.billing.findAndCountPromotionsByCompany({
      companyId: company.id,
      page: 1,
      limit: 1000,
    });

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId,
            planName: plan?.name ?? null,
            status: subscription.status,
            startsAt: subscription.startsAt ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd ?? null,
            autoRenew: subscription.autoRenew,
            promotionCredits: subscription.promotionCredits ?? 0,
            usedPromotionCredits: subscription.usedPromotionCredits ?? 0,
            availableCredits:
              (subscription.promotionCredits ?? 0) -
              (subscription.usedPromotionCredits ?? 0),
            promotionDurationDays: durationDays,
          }
        : null,
      promotionsIncluded: included,
      promotionsUsed: used,
      promotionsAvailable: subscription
        ? (subscription.promotionCredits ?? 0) -
          (subscription.usedPromotionCredits ?? 0)
        : 0,
      promotionDurationDays: durationDays,
      promotionsCount: rows.length,
    };
  }

  /** Vacantes activas de la empresa sin promoción viva. */
  async eligibleVacancies(actor: BillingActor): Promise<any[]> {
    const company = await this.ownership.requireCompany(actor.userId);
    const [vacancies] = await this.vacancies.findAndCountByCompany({
      companyId: company.id,
      status: VacancyStatus.ACTIVE,
      page: 1,
      limit: 100,
    });

    const result: any[] = [];
    for (const vacancy of vacancies) {
      const live = await this.billing.findLivePromotionByVacancy(vacancy.id);
      if (!live) {
        result.push({
          id: vacancy.id,
          title: vacancy.title,
          status: vacancy.status,
          expiresAt: vacancy.expiresAt ?? null,
        });
      }
    }
    return result;
  }

  /** Promoción por id (propia de la empresa). */
  async getById(id: string, actor: BillingActor): Promise<any> {
    const company = await this.ownership.requireCompany(actor.userId);
    const promotion = await this.billing.findPromotionByIdAndCompany(
      id,
      company.id,
    );
    if (!promotion) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PROMOTION_NOT_FOUND,
        'La promoción no existe.',
      );
    }
    const [item] = await this.decorate([promotion]);
    return item;
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

  private addDays(from: Date, days: number): Date {
    const result = new Date(from);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async decorate(
    rows: VacancyPromotion[],
  ): Promise<PromotionResponseDto[]> {
    if (rows.length === 0) return [];

    return Promise.all(
      rows.map(async (promotion) => {
        const [plan, orders, vacancy] = await Promise.all([
          this.plans.findById(promotion.planId),
          this.billing.findOrdersByPromotionId(promotion.id),
          this.vacancies.findById(promotion.vacancyId),
        ]);
        return toPromotionResponse(
          promotion,
          plan?.name ?? null,
          orders[0] ?? null,
          vacancy?.title ?? null,
        );
      }),
    );
  }
}
