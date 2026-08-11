import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { ProcessedPaymentEvent } from '@/modules/billing/entities/processed-payment-event.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  PaymentStatus,
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
import { EntitlementService } from '@/modules/billing/services/entitlement.service';
import { PaymentEvent } from '@/modules/billing/services/payment-provider.port';
import { TalentGrantSource } from '@/modules/talent/enums/talent-access.enum';

/** Resultado de aplicar un evento de pago. */
export interface SettlementResult {
  /** `false` = evento duplicado, no se hizo nada. */
  applied: boolean;
  orderId: string | null;
  paymentStatus: PaymentStatus | null;
}

/**
 * Aplica un evento de la pasarela a la orden correspondiente.
 *
 * **Este es el único camino por el que un pago surte efecto**, venga del
 * webhook de Stripe, de la confirmación manual o de la reconciliación. Todo lo
 * que sigue a un pago —activar la promoción, aplicar los distintivos a la
 * vacante y otorgar el cupo de la base de talento— ocurre aquí, en una sola
 * transacción.
 *
 * Idempotencia: el evento se registra **antes** y fuera de la transacción; si
 * ya existía, se descarta. Sin esto, un webhook reintentado otorgaría el cupo
 * dos veces.
 */
@Injectable()
export class SettlePaymentUseCase {
  private readonly logger = new Logger(SettlePaymentUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    private readonly entitlements: EntitlementService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(event: PaymentEvent): Promise<SettlementResult> {
    const record = new ProcessedPaymentEvent();
    record.provider = event.provider;
    record.eventId = event.eventId || randomUUID();
    record.type = event.type;
    record.processedAt = new Date();

    const isNew = await this.billing.registerEventOnce(record);
    if (!isNew) {
      this.logger.log(
        `Evento ${event.provider}/${record.eventId} ya procesado; se ignora.`,
      );
      return { applied: false, orderId: null, paymentStatus: null };
    }

    const order = await this.billing.findOrderByExternalReference(
      event.externalReference,
    );
    if (!order) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PAYMENT_ORDER_NOT_FOUND,
        'No hay ninguna orden con esa referencia.',
      );
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_ALREADY_SETTLED,
        'Esa orden ya está pagada.',
      );
    }

    await runInTransaction(this.dataSource, async (manager) => {
      order.paymentStatus = event.status;
      if (event.status === PaymentStatus.PAID) {
        order.paidAt = new Date();
      }
      await this.billing.saveOrder(order, manager);

      if (event.status === PaymentStatus.PAID) {
        await this.activate(order, event, manager);
      } else if (
        event.status === PaymentStatus.FAILED ||
        event.status === PaymentStatus.REFUNDED
      ) {
        await this.cancel(order, manager);
      }
    });

    await this.audit.record({
      action: 'payments.settle',
      entity: 'promotion_order',
      entityId: order.id,
      metadata: {
        provider: event.provider,
        eventId: record.eventId,
        type: event.type,
        paymentStatus: event.status,
      },
    });

    return {
      applied: true,
      orderId: order.id,
      paymentStatus: event.status,
    };
  }

  /** Pago confirmado: activa lo comprado y reparte los beneficios. */
  private async activate(
    order: PromotionOrder,
    event: PaymentEvent,
    manager: EntityManager,
  ): Promise<void> {
    const now = new Date();

    if (order.promotionId) {
      const promotion = await this.billing.findPromotionById(
        order.promotionId,
        manager,
      );
      if (!promotion) return;

      const plan = await this.plans.findById(promotion.planId, manager);
      if (!plan) return;

      const entitlements = await this.entitlements.resolve(plan, manager);
      const { endsAt } = await this.entitlements.applyToVacancy(
        promotion.vacancyId,
        plan,
        entitlements,
        now,
        manager,
      );

      promotion.status = PromotionStatus.ACTIVE;
      promotion.startsAt = now;
      promotion.endsAt = endsAt;
      await this.billing.savePromotion(promotion, manager);

      // Aquí es donde M12 deja de responder 402.
      await this.entitlements.grantTalentVisits(
        promotion.companyId,
        entitlements,
        TalentGrantSource.PROMOTION,
        promotion.id,
        endsAt,
        manager,
      );
      return;
    }

    if (order.subscriptionId) {
      const subscription = await this.billing.findSubscriptionById(
        order.subscriptionId,
        manager,
      );
      if (!subscription) return;

      const plan = await this.plans.findById(subscription.planId, manager);
      if (!plan) return;

      const entitlements = await this.entitlements.resolve(plan, manager);
      // El proveedor manda el fin de periodo; si no lo trae, un año.
      const periodEnd = event.currentPeriodEnd ?? this.addYear(now);

      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.startsAt ??= now;
      subscription.currentPeriodEnd = periodEnd;
      await this.billing.saveSubscription(subscription, manager);

      // Cada renovación recarga el cupo: se otorga un grant nuevo por periodo.
      await this.entitlements.grantTalentVisits(
        subscription.companyId,
        entitlements,
        TalentGrantSource.SUBSCRIPTION,
        subscription.id,
        periodEnd,
        manager,
      );
    }
  }

  /** Pago fallido o devuelto: se deshace la reserva. */
  private async cancel(
    order: PromotionOrder,
    manager: EntityManager,
  ): Promise<void> {
    if (order.promotionId) {
      const promotion = await this.billing.findPromotionById(
        order.promotionId,
        manager,
      );
      if (promotion && promotion.status === PromotionStatus.PENDING_PAYMENT) {
        promotion.status = PromotionStatus.CANCELLED;
        await this.billing.savePromotion(promotion, manager);
      }
      return;
    }

    if (order.subscriptionId) {
      const subscription = await this.billing.findSubscriptionById(
        order.subscriptionId,
        manager,
      );
      if (
        subscription &&
        subscription.status === SubscriptionStatus.PENDING_PAYMENT
      ) {
        subscription.status = SubscriptionStatus.CANCELLED;
        await this.billing.saveSubscription(subscription, manager);
      }
    }
  }

  private addYear(from: Date): Date {
    const result = new Date(from);
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }
}
