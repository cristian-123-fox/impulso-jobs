import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  SubscriptionResponseDto,
  toSubscriptionResponse,
} from '@/modules/billing/dto/billing-response.dto';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
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
import { CompanySubscriptionNotifier } from '@/modules/billing/services/company-subscription-notifier.service';
import {
  type PaymentProviderPort,
  PAYMENT_PROVIDER,
} from '@/modules/billing/services/payment-provider.port';
import {
  PriceBreakdown,
  PricingService,
} from '@/modules/billing/services/pricing.service';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { TalentGrantSource } from '@/modules/talent/enums/talent-access.enum';
import {
  type ITalentAccessRepository,
  TALENT_ACCESS_REPOSITORY,
} from '@/modules/talent/repositories/talent-access.repository.interface';

/** Quién ejecuta la acción, para la auditoría. */
export interface AdminSubscriptionActor {
  userId: string;
  ip: string;
  userAgent: string;
}

export interface AssignSubscriptionCommand {
  companyId: string;
  planId: string;
  reason: string;
  currentPeriodEnd?: string;
  amount?: number;
  method?: PaymentMethod;
  autoRenew?: boolean;
  actor: AdminSubscriptionActor;
}

export interface UpdateSubscriptionCommand {
  companyId: string;
  reason: string;
  currentPeriodEnd?: string;
  autoRenew?: boolean;
  actor: AdminSubscriptionActor;
}

export interface RevokeSubscriptionCommand {
  companyId: string;
  reason: string;
  actor: AdminSubscriptionActor;
}

/** Método por defecto de una venta cerrada fuera de la plataforma. */
const DEFAULT_METHOD = PaymentMethod.SPEI;

/**
 * `TalentAccessGrant.sourceType` se guarda como `varchar`, no como enum: la
 * comparación se hace contra el valor, no contra el tipo.
 */
const SUBSCRIPTION_SOURCE: string = TalentGrantSource.SUBSCRIPTION;

/**
 * T34 · El administrador asigna, cambia y retira el plan de una empresa.
 *
 * **No abre un camino paralelo al de la compra.** La asignación crea la
 * suscripción y su orden igual que el autoservicio, abre el cobro por el
 * `PaymentProviderPort` y lo liquida con `SettlePaymentUseCase` — que es quien
 * activa la suscripción y otorga el cupo de la base de talento. Escribir el
 * alta "por la izquierda" dejaría a la empresa con plan pero sin cupos, que es
 * exactamente el fallo que la tarjeta pedía evitar.
 *
 * Decisiones de negocio (N13, 2026-09-13):
 *
 * - **Toda asignación manual es una venta.** Se registra una orden pagada con
 *   el precio vigente del plan; el administrador puede corregir el importe
 *   (descuento negociado, precio antiguo). Es lo que mañana alimentará el CFDI.
 * - **Retirar respeta lo ya concedido.** Se sigue el mismo camino que el
 *   vencimiento natural (`ExpireSubscriptionsUseCase`): sólo cambia el estado.
 *   Los cupos de talento mueren solos por su `expiresAt`.
 * - **Cambiar de plan sí recalcula.** El cupo del plan anterior se cierra en el
 *   acto y nace el del plan nuevo; si no, subir y bajar de plan acumularía cupo
 *   para siempre.
 * - **Los distintivos de vacante quedan fuera.** N13 pregunta si al retirar el
 *   plan la empresa conserva sus vacantes destacadas: hoy la suscripción anual
 *   **nunca** enciende `isFeatured`/`isUrgent`/`isVerified` — eso lo hace
 *   `EntitlementService.applyToVacancy()`, que sólo llaman las promociones por
 *   vacante. Retirar la suscripción no puede quitar lo que nunca dio, así que
 *   no hay nada que decidir aquí. Que la suscripción aplique además beneficios
 *   a las vacantes de la empresa es un cambio de fondo, fuera del alcance.
 */
@Injectable()
export class AdminSubscriptionUseCase {
  private readonly logger = new Logger(AdminSubscriptionUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(TALENT_ACCESS_REPOSITORY)
    private readonly talent: ITalentAccessRepository,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
    private readonly pricing: PricingService,
    private readonly settle: SettlePaymentUseCase,
    private readonly notifier: CompanySubscriptionNotifier,
    private readonly audit: AuditService,
  ) {}

  /** Suscripción vigente de una empresa, o `null` si no tiene. */
  async current(companyId: string): Promise<SubscriptionResponseDto | null> {
    await this.requireCompany(companyId);

    const subscription = await this.billing.findLiveSubscriptionByCompany(
      companyId,
      new Date(),
    );
    if (!subscription) return null;

    const plan = await this.plans.findById(subscription.planId);
    return toSubscriptionResponse(subscription, plan?.name ?? null, null);
  }

  /**
   * Asigna un plan, o lo cambia si la empresa ya tenía uno.
   *
   * El catálogo no se filtra por `isActive`: un cliente antiguo puede conservar
   * un plan retirado del escaparate. Tampoco por tipo — un plan por publicación
   * asignado como suscripción es un estado raro pero deliberado (la empresa
   * recibe el cupo de talento del plan durante el periodo, y ninguna vacante
   * queda destacada), así que se registra en auditoría para que se vea.
   */
  async assign(
    command: AssignSubscriptionCommand,
  ): Promise<SubscriptionResponseDto> {
    const company = await this.requireCompany(command.companyId);
    const plan = await this.requirePlan(command.planId);

    const now = new Date();
    const periodEnd = this.resolvePeriodEnd(command.currentPeriodEnd, now);
    const price = this.priceFor(plan, command.amount);
    const method = command.method ?? DEFAULT_METHOD;

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

    // Cambio de plan: el anterior se cierra y su cupo deja de contar hoy.
    const previous = await this.billing.findLiveSubscriptionByCompany(
      company.id,
      now,
    );
    const previousPlan = previous
      ? await this.plans.findById(previous.planId)
      : null;
    if (previous) await this.closePrevious(previous, now);

    const subscription = new CompanySubscription();
    subscription.companyId = company.id;
    subscription.planId = plan.id;
    subscription.status = SubscriptionStatus.PENDING_PAYMENT;
    subscription.autoRenew = command.autoRenew ?? true;
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
      concept: `${plan.name} · asignado por el administrador`,
      total: price.total,
      currency: price.currency,
      method,
      installments: 1,
      recurring: true,
      providerPriceId: plan.providerPriceId,
    });

    savedOrder.externalReference = checkout.externalReference;
    savedOrder.paymentStatus = checkout.status;
    await this.billing.saveOrder(savedOrder);

    // Aquí se activa y se otorga el cupo: el mismo camino que un pago real.
    await this.settle.execute({
      provider: this.payments.name,
      eventId: randomUUID(),
      type: 'payment.succeeded',
      externalReference: checkout.externalReference,
      status: PaymentStatus.PAID,
      currentPeriodEnd: periodEnd,
    });

    await this.audit.record({
      action: previous
        ? 'subscriptions.admin_change'
        : 'subscriptions.admin_assign',
      actorUserId: command.actor.userId,
      entity: 'company_subscription',
      entityId: savedSubscription.id,
      ip: command.actor.ip,
      userAgent: command.actor.userAgent,
      metadata: {
        reason: command.reason,
        companyId: company.id,
        planId: plan.id,
        planCode: plan.code,
        planType: plan.planType,
        planIsActive: plan.isActive,
        // Un plan por publicación como suscripción es legal pero extraño:
        // queda anotado para que una revisión posterior lo entienda.
        assignedPerPublicationPlan: plan.planType === PlanType.PER_PUBLICATION,
        orderId: savedOrder.id,
        method,
        subtotal: price.subtotal,
        total: price.total,
        currentPeriodEnd: periodEnd.toISOString(),
        previousSubscriptionId: previous?.id ?? null,
        previousPlanId: previous?.planId ?? null,
      },
    });

    const reloaded = await this.reload(savedSubscription.id);
    await this.notifier.notifyCompany(company.id, {
      type: NotificationType.SUBSCRIPTION_ASSIGNED,
      title: previous ? 'Tu plan cambió' : 'Tu empresa ya tiene plan',
      body: previous
        ? `Tu plan pasó de ${previousPlan?.name ?? 'el anterior'} a ${plan.name}, ` +
          `vigente hasta el ${formatDate(periodEnd)}.`
        : `Tu empresa ahora tiene el plan ${plan.name}, vigente hasta el ${formatDate(periodEnd)}.`,
      link: '/empresa/promociones',
    });

    return toSubscriptionResponse(reloaded, plan.name, null);
  }

  /**
   * Prórrogas y ajustes de renovación sobre la suscripción vigente.
   *
   * Al mover el fin de periodo se arrastra el cupo de talento: el grant se
   * guardó con `expiresAt = currentPeriodEnd`, así que sin esto una prórroga
   * alargaría el plan pero dejaría a la empresa sin poder ver CVs desde la
   * fecha vieja.
   */
  async update(
    command: UpdateSubscriptionCommand,
  ): Promise<SubscriptionResponseDto> {
    await this.requireCompany(command.companyId);

    if (
      command.currentPeriodEnd === undefined &&
      command.autoRenew === undefined
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Indica al menos la nueva vigencia o la renovación automática.',
      );
    }

    const now = new Date();
    const subscription = await this.requireLiveSubscription(
      command.companyId,
      now,
    );
    const previousEnd = subscription.currentPeriodEnd ?? null;

    if (command.currentPeriodEnd !== undefined) {
      const periodEnd = this.resolvePeriodEnd(command.currentPeriodEnd, now);
      subscription.currentPeriodEnd = periodEnd;
      await this.syncGrantExpiry(subscription, periodEnd, now);
    }
    if (command.autoRenew !== undefined) {
      subscription.autoRenew = command.autoRenew;
    }

    const saved = await this.billing.saveSubscription(subscription);

    await this.audit.record({
      action: 'subscriptions.admin_update',
      actorUserId: command.actor.userId,
      entity: 'company_subscription',
      entityId: saved.id,
      ip: command.actor.ip,
      userAgent: command.actor.userAgent,
      metadata: {
        reason: command.reason,
        companyId: command.companyId,
        planId: saved.planId,
        previousPeriodEnd: previousEnd?.toISOString() ?? null,
        currentPeriodEnd: saved.currentPeriodEnd?.toISOString() ?? null,
        autoRenew: saved.autoRenew,
      },
    });

    const plan = await this.plans.findById(saved.planId);
    const movedPeriod = command.currentPeriodEnd !== undefined;
    await this.notifier.notifyCompany(command.companyId, {
      type: NotificationType.SUBSCRIPTION_UPDATED,
      // Ajustar sólo la renovación no mueve la fecha: decir lo contrario
      // haría que la empresa buscase un cambio que no existe.
      title: movedPeriod
        ? 'Cambió la vigencia de tu plan'
        : 'Cambió la renovación de tu plan',
      body:
        `Tu plan ${plan?.name ?? ''}`.trimEnd() +
        ` ${movedPeriod ? 'ahora vence' : 'vence'} el ${formatDate(saved.currentPeriodEnd)}` +
        `${saved.autoRenew ? ' y se renovará automáticamente' : ' y no se renovará automáticamente'}.`,
      link: '/empresa/promociones',
    });

    return toSubscriptionResponse(saved, plan?.name ?? null, null);
  }

  /**
   * Retira el plan. **No toca los cupos ya concedidos** (decisión N13): es el
   * mismo comportamiento que el vencimiento natural, donde el grant sigue vivo
   * hasta su `expiresAt`. La empresa queda libre para volver a contratar,
   * porque `CANCELLED` no cuenta como suscripción viva.
   */
  async revoke(command: RevokeSubscriptionCommand): Promise<void> {
    await this.requireCompany(command.companyId);

    const now = new Date();
    const subscription = await this.requireLiveSubscription(
      command.companyId,
      now,
    );

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;
    const saved = await this.billing.saveSubscription(subscription);

    await this.audit.record({
      action: 'subscriptions.admin_revoke',
      actorUserId: command.actor.userId,
      entity: 'company_subscription',
      entityId: saved.id,
      ip: command.actor.ip,
      userAgent: command.actor.userAgent,
      metadata: {
        reason: command.reason,
        companyId: command.companyId,
        planId: saved.planId,
        // Se anota explícitamente: el cupo sigue vivo hasta esta fecha.
        grantsRespectedUntil: saved.currentPeriodEnd?.toISOString() ?? null,
      },
    });

    const plan = await this.plans.findById(saved.planId);
    await this.notifier.notifyCompany(command.companyId, {
      type: NotificationType.SUBSCRIPTION_REVOKED,
      title: 'Tu plan fue retirado',
      body:
        `El plan ${plan?.name ?? 'de tu empresa'} ya no está activo. ` +
        'Puedes contratar uno nuevo cuando quieras desde tu panel.',
      link: '/planes',
    });
  }

  // ------------------------------------------------------------- privados

  /**
   * Cierra la suscripción anterior y corta su cupo de talento en el acto, para
   * que cambiar de plan **recalcule** en vez de acumular. Es la diferencia
   * deliberada con `revoke()`, donde el cupo se respeta.
   */
  private async closePrevious(
    previous: CompanySubscription,
    now: Date,
  ): Promise<void> {
    previous.status = SubscriptionStatus.CANCELLED;
    previous.autoRenew = false;
    await this.billing.saveSubscription(previous);

    const grants = await this.talent.findActiveGrants(previous.companyId, now);
    for (const grant of grants) {
      if (
        grant.sourceType !== SUBSCRIPTION_SOURCE ||
        grant.sourceId !== previous.id
      ) {
        continue;
      }
      grant.expiresAt = now;
      await this.talent.saveGrant(grant);
    }
  }

  /** Arrastra el cupo vigente de la suscripción al nuevo fin de periodo. */
  private async syncGrantExpiry(
    subscription: CompanySubscription,
    periodEnd: Date,
    now: Date,
  ): Promise<void> {
    const grants = await this.talent.findActiveGrants(
      subscription.companyId,
      now,
    );
    for (const grant of grants) {
      if (
        grant.sourceType !== SUBSCRIPTION_SOURCE ||
        grant.sourceId !== subscription.id ||
        grant.expiresAt === null ||
        grant.expiresAt === undefined
      ) {
        continue;
      }
      grant.expiresAt = periodEnd;
      await this.talent.saveGrant(grant);
    }
  }

  /**
   * Importe a registrar. Por defecto el precio vigente del plan; si el
   * administrador lo corrige, el IVA se recalcula con la tasa del plan para que
   * el desglose siga cuadrando.
   */
  private priceFor(plan: Plan, amount?: number): PriceBreakdown {
    const breakdown = this.pricing.breakdown(plan);
    if (amount === undefined) return breakdown;

    const subtotal = round2(amount);
    const taxAmount = round2(subtotal * breakdown.taxRate);
    return {
      subtotal,
      taxRate: breakdown.taxRate,
      taxAmount,
      total: round2(subtotal + taxAmount),
      currency: breakdown.currency,
    };
  }

  /** Un año desde hoy salvo que el administrador diga otra cosa. */
  private resolvePeriodEnd(raw: string | undefined, now: Date): Date {
    if (raw === undefined) return addYear(now);

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'La fecha de vencimiento no es válida.',
      );
    }
    if (parsed.getTime() <= now.getTime()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'La fecha de vencimiento debe ser posterior a hoy.',
      );
    }
    return parsed;
  }

  private async requireCompany(companyId: string): Promise<{ id: string }> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_NOT_FOUND,
        'La empresa no existe.',
      );
    }
    return company;
  }

  private async requirePlan(planId: string): Promise<Plan> {
    const plan = await this.plans.findById(planId);
    if (!plan) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PLAN_NOT_FOUND,
        'El plan no existe.',
      );
    }
    return plan;
  }

  private async requireLiveSubscription(
    companyId: string,
    now: Date,
  ): Promise<CompanySubscription> {
    const subscription = await this.billing.findLiveSubscriptionByCompany(
      companyId,
      now,
    );
    if (!subscription) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.SUBSCRIPTION_NOT_FOUND,
        'Esta empresa no tiene ninguna suscripción vigente.',
      );
    }
    return subscription;
  }

  /**
   * Relee la suscripción después de liquidar: `SettlePaymentUseCase` la activó
   * y le puso el fin de periodo en su propia transacción, así que la instancia
   * que teníamos en memoria está desfasada.
   */
  private async reload(id: string): Promise<CompanySubscription> {
    const subscription = await this.billing.findSubscriptionById(id);
    if (!subscription) {
      this.logger.error(`La suscripción ${id} desapareció tras liquidarla.`);
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'No se pudo leer la suscripción recién creada.',
      );
    }
    return subscription;
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addYear(from: Date): Date {
  const result = new Date(from);
  result.setFullYear(result.getFullYear() + 1);
  return result;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return 'pronto';
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
