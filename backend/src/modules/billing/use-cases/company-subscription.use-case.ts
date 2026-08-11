import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CheckoutResponseDto,
  SubscriptionResponseDto,
  toOrderResponse,
  toSubscriptionResponse,
} from '@/modules/billing/dto/billing-response.dto';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  PaymentMethod,
  PaymentStatus,
  PlanType,
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
import {
  type PaymentProviderPort,
  PAYMENT_PROVIDER,
} from '@/modules/billing/services/payment-provider.port';
import { PricingService } from '@/modules/billing/services/pricing.service';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

/**
 * Suscripción anual de la empresa (plan Anual).
 *
 * A diferencia de la promoción, aquí se crea y se abre el cobro en un solo
 * paso: no hay una vacante que reservar, así que separar los dos pasos no
 * aportaría nada.
 */
@Injectable()
export class CompanySubscriptionUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
    private readonly pricing: PricingService,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async create(
    planId: string,
    method: PaymentMethod,
    actor: BillingActor,
  ): Promise<CheckoutResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);

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
    if (plan.planType !== PlanType.ANNUAL_SUBSCRIPTION) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PLAN_WRONG_TYPE,
        'Ese plan se compra por vacante, no es una suscripción.',
      );
    }

    const live = await this.billing.findLiveSubscriptionByCompany(company.id);
    if (live) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.SUBSCRIPTION_ALREADY_EXISTS,
        'Tu empresa ya tiene una suscripción vigente o pendiente de pago.',
      );
    }

    const price = this.pricing.breakdown(plan);
    // Recurrente: OXXO y MSI quedan descartados por el propio servicio.
    const availability = this.pricing.isMethodAvailable(
      method,
      price.total,
      true,
    );
    if (!availability.available) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE,
        availability.reason ?? 'Ese método de pago no está disponible.',
      );
    }

    const subscription = new CompanySubscription();
    subscription.companyId = company.id;
    subscription.planId = plan.id;
    subscription.status = SubscriptionStatus.PENDING_PAYMENT;
    subscription.autoRenew = true;
    const savedSubscription = await this.billing.saveSubscription(subscription);

    const order = new PromotionOrder();
    order.subscriptionId = savedSubscription.id;
    order.companyId = company.id;
    order.provider = this.payments.name;
    order.paymentMethod = method;
    order.paymentStatus = PaymentStatus.PENDING;
    order.subtotal = price.subtotal.toFixed(2);
    order.taxAmount = price.taxAmount.toFixed(2);
    order.total = price.total.toFixed(2);
    order.currency = price.currency;
    order.installments = 1;
    const savedOrder = await this.billing.saveOrder(order);

    const checkout = await this.payments.createCheckout({
      orderId: savedOrder.id,
      companyId: company.id,
      concept: `${plan.name} · suscripción anual`,
      total: price.total,
      currency: price.currency,
      method,
      installments: 1,
      recurring: true,
      providerPriceId: plan.providerPriceId,
    });

    savedOrder.externalReference = checkout.externalReference;
    savedOrder.paymentStatus = checkout.status;
    const withReference = await this.billing.saveOrder(savedOrder);

    await this.audit.record({
      action: 'subscriptions.create',
      actorUserId: actor.userId,
      entity: 'company_subscription',
      entityId: savedSubscription.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { planCode: plan.code, method, total: withReference.total },
    });

    return {
      orderId: withReference.id,
      checkoutUrl: checkout.checkoutUrl,
      order: toOrderResponse(withReference),
    };
  }

  /** Suscripción vigente de la empresa, si la tiene. */
  async current(actor: BillingActor): Promise<SubscriptionResponseDto | null> {
    const company = await this.ownership.requireCompany(actor.userId);
    const subscription = await this.billing.findLiveSubscriptionByCompany(
      company.id,
    );
    if (!subscription) return null;

    const plan = await this.plans.findById(subscription.planId);
    return toSubscriptionResponse(subscription, plan?.name ?? null, null);
  }

  /** Cancela la renovación automática; el periodo pagado se respeta. */
  async cancelRenewal(actor: BillingActor): Promise<SubscriptionResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const subscription = await this.billing.findLiveSubscriptionByCompany(
      company.id,
    );
    if (!subscription) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.SUBSCRIPTION_NOT_FOUND,
        'No tienes ninguna suscripción vigente.',
      );
    }

    subscription.autoRenew = false;
    const saved = await this.billing.saveSubscription(subscription);

    await this.audit.record({
      action: 'subscriptions.cancel_renewal',
      actorUserId: actor.userId,
      entity: 'company_subscription',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    const plan = await this.plans.findById(saved.planId);
    return toSubscriptionResponse(saved, plan?.name ?? null, null);
  }
}
