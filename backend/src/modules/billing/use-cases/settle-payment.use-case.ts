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
  OPEN_PAYMENT_STATUSES,
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
import { CompanySubscriptionNotifier } from '@/modules/billing/services/company-subscription-notifier.service';
import { EntitlementService } from '@/modules/billing/services/entitlement.service';
import { PaymentEvent } from '@/modules/billing/services/payment-provider.port';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { TalentGrantSource } from '@/modules/talent/enums/talent-access.enum';

/** Resultado de aplicar un evento de pago. */
export interface SettlementResult {
  /** `false` = evento duplicado, no se hizo nada. */
  applied: boolean;
  orderId: string | null;
  paymentStatus: PaymentStatus | null;
}

/** Datos que necesita el aviso de "plan activo", capturados dentro de la transacción. */
interface SubscriptionActivation {
  companyId: string;
  planName: string;
  periodEnd: Date;
  postingCredits: number;
  promotionCredits: number;
  /** `true` si la suscripción ya estaba activa: fue una renovación. */
  renewal: boolean;
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
 * dos veces. Si el procesamiento falla después, el acuse **se borra**: de lo
 * contrario el reintento de la pasarela se descartaría como duplicado y el
 * pago quedaría cobrado pero sin aplicar.
 */
@Injectable()
export class SettlePaymentUseCase {
  private readonly logger = new Logger(SettlePaymentUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    private readonly entitlements: EntitlementService,
    private readonly audit: AuditService,
    private readonly notifier: CompanySubscriptionNotifier,
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

    try {
      return await this.apply(event, record);
    } catch (error) {
      await this.forget(record);
      throw error;
    }
  }

  /** Borra el acuse sin tapar el error original si también falla. */
  private async forget(record: ProcessedPaymentEvent): Promise<void> {
    try {
      await this.billing.forgetEvent(record.provider, record.eventId);
    } catch (forgetError) {
      this.logger.error(
        `No se pudo borrar el acuse de ${record.provider}/${record.eventId}: ${
          forgetError instanceof Error
            ? forgetError.message
            : String(forgetError)
        }`,
      );
    }
  }

  private async apply(
    event: PaymentEvent,
    record: ProcessedPaymentEvent,
  ): Promise<SettlementResult> {
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

    const activation = await runInTransaction(
      this.dataSource,
      async (manager) => {
        order.paymentStatus = event.status;
        if (event.status === PaymentStatus.PAID) {
          order.paidAt = new Date();
        }
        await this.billing.saveOrder(order, manager);

        if (event.status === PaymentStatus.PAID) {
          return this.activate(order, event, manager);
        }
        if (
          event.status === PaymentStatus.FAILED ||
          event.status === PaymentStatus.REFUNDED
        ) {
          await this.cancel(order, manager);
        }
        return null;
      },
    );

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

    // Aviso de plan activo **sólo para pagos de pasarela**. En la confirmación
    // manual, `AdminPaymentsUseCase` ya envía `PAYMENT_CONFIRMED` con el mismo
    // mensaje; avisar también aquí duplicaría la notificación.
    if (activation && order.provider !== 'manual') {
      await this.notifyActivated(activation);
    }

    return {
      applied: true,
      orderId: order.id,
      paymentStatus: event.status,
    };
  }

  /** Aviso best-effort: el plan ya está activo y auditado. */
  private async notifyActivated(
    activation: SubscriptionActivation,
  ): Promise<void> {
    const postings =
      activation.postingCredits < 0
        ? 'publicaciones ilimitadas'
        : `${activation.postingCredits} ${
            activation.postingCredits === 1 ? 'publicación' : 'publicaciones'
          }`;
    const promotions =
      activation.promotionCredits > 0
        ? ` y ${activation.promotionCredits} ${
            activation.promotionCredits === 1 ? 'promoción' : 'promociones'
          }`
        : '';
    const body =
      `Tu plan ${activation.planName} ` +
      (activation.renewal
        ? `se renovó hasta el ${formatDate(activation.periodEnd)}.`
        : `ya está activo hasta el ${formatDate(activation.periodEnd)}.`) +
      ` Incluye ${postings}${promotions}.`;

    await this.notifier.notifyCompany(activation.companyId, {
      type: NotificationType.SUBSCRIPTION_ACTIVATED,
      title: activation.renewal ? 'Tu plan se renovó' : 'Tu plan ya está activo',
      body,
      link: '/empresa/promociones',
    });
  }

  /** Pago confirmado: activa lo comprado y reparte los beneficios. */
  private async activate(
    order: PromotionOrder,
    event: PaymentEvent,
    manager: EntityManager,
  ): Promise<SubscriptionActivation | null> {
    const now = new Date();

    if (order.promotionId) {
      const promotion = await this.billing.findPromotionById(
        order.promotionId,
        manager,
      );
      if (!promotion) return null;

      const plan = await this.plans.findById(promotion.planId, manager);
      if (!plan) return null;

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
      return null;
    }

    if (order.subscriptionId) {
      const subscription = await this.billing.findSubscriptionById(
        order.subscriptionId,
        manager,
      );
      if (!subscription) return null;

      const plan = await this.plans.findById(subscription.planId, manager);
      if (!plan) return null;

      // Si ya estaba activa, este pago es una renovación, no el alta inicial.
      const renewal = subscription.status === SubscriptionStatus.ACTIVE;

      const entitlements = await this.entitlements.resolve(plan, manager);
      // El proveedor manda el fin de periodo; si no lo trae, un año (anual) o
      // la vigencia del plan (Básico 30 / Premium 60).
      const periodEnd =
        event.currentPeriodEnd ??
        (plan.planType === PlanType.PER_PUBLICATION && plan.validityDays
          ? this.addDays(now, plan.validityDays)
          : this.addYear(now));

      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.startsAt ??= now;
      subscription.currentPeriodEnd = periodEnd;
      // Publicaciones incluidas: el plan manda. En los planes por publicación
      // el valor por defecto es 1; en la anual, `null` = ilimitadas (-1).
      subscription.postingCredits =
        plan.planType === PlanType.PER_PUBLICATION
          ? Math.max(0, plan.postingQuota ?? 1)
          : (plan.postingQuota ?? -1);
      subscription.usedPostingCredits = 0;

      // El plan es la fuente de verdad: `promoted_vacancies` se resuelve en el
      // mismo lugar que el resto de beneficios. Si el valor falta, el plan no
      // incluye promociones y se guarda 0, no un número inventado.
      subscription.promotionCredits = Math.max(
        0,
        entitlements.promotionCredits,
      );
      subscription.usedPromotionCredits = 0;
      // Con una pasarela recurrente, su id es lo que reconoce las renovaciones
      // (`invoice.paid`) y lo que se cancela al quitar la renovación.
      if (event.providerSubscriptionId) {
        subscription.providerSubscriptionId = event.providerSubscriptionId;
      }
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

      return {
        companyId: subscription.companyId,
        planName: plan.name,
        periodEnd,
        postingCredits: subscription.postingCredits,
        promotionCredits: subscription.promotionCredits,
        renewal,
      };
    }

    return null;
  }

  /**
   * Pago fallido o devuelto: se deshace la reserva — **salvo que otra orden de
   * la misma compra siga viva**. Pasa al reintentar: la empresa abandona un
   * Checkout, abre otro, y la caducidad del primero llega después. Cancelar
   * ahí dejaría la segunda orden pagando una promoción ya cancelada.
   */
  private async cancel(
    order: PromotionOrder,
    manager: EntityManager,
  ): Promise<void> {
    const siblings = order.promotionId
      ? await this.billing.findOrdersByPromotionId(order.promotionId, manager)
      : order.subscriptionId
        ? await this.billing.findOrdersBySubscriptionId(
            order.subscriptionId,
            manager,
          )
        : [];
    const anotherAlive = siblings.some(
      (sibling) =>
        sibling.id !== order.id &&
        (sibling.paymentStatus === PaymentStatus.PAID ||
          OPEN_PAYMENT_STATUSES.includes(sibling.paymentStatus)),
    );
    if (anotherAlive) return;

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

  private addDays(from: Date, days: number): Date {
    const result = new Date(from);
    result.setDate(result.getDate() + days);
    return result;
  }
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
