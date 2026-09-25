import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  AdminPaymentResponseDto,
  ListAdminPaymentsQueryDto,
} from '@/modules/billing/dto/admin-payment.dto';
import { toOrderResponse } from '@/modules/billing/dto/billing-response.dto';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  OPEN_PAYMENT_STATUSES,
  PaymentStatus,
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
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

/** Qué se compró, para el aviso a la empresa y la fila del listado. */
interface OrderSubject {
  planName: string | null;
  vacancyId: string | null;
  vacancyTitle: string | null;
}

/**
 * Cola de cobros del back-office: ver las órdenes y cerrar a mano las que el
 * adaptador manual dejó en espera.
 *
 * **No activa nada por su cuenta.** Confirmar y rechazar construyen el mismo
 * `PaymentEvent` que mandará el webhook de Stripe y lo entregan a
 * `SettlePaymentUseCase`, que es quien activa la promoción o la suscripción y
 * otorga el cupo de talento. Así, el día que exista la pasarela, esta pantalla
 * sigue valiendo para los cobros por transferencia que se concilien a mano.
 *
 * El id del evento es `admin:<orderId>`: confirmar y rechazar son excluyentes,
 * así que un doble clic —o dos administradores a la vez— se queda en uno solo
 * por la idempotencia de `processed_payment_events`.
 */
@Injectable()
export class AdminPaymentsUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    private readonly settle: SettlePaymentUseCase,
    private readonly notifier: CompanySubscriptionNotifier,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListAdminPaymentsQueryDto,
  ): Promise<PaginatedResponse<AdminPaymentResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const statuses =
      query.status === 'OPEN'
        ? OPEN_PAYMENT_STATUSES
        : query.status
          ? [query.status]
          : [];

    const [rows, total] = await this.billing.findAndCountOrders({
      statuses,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page,
      limit,
    });

    const items = await this.decorate(rows);
    return toPaginated(items, total, page, limit);
  }

  async confirm(
    orderId: string,
    actor: BillingActor,
  ): Promise<AdminPaymentResponseDto> {
    const order = await this.requireOpenOrder(orderId);
    const reference = await this.ensureReference(order);

    await this.settle.execute({
      provider: order.provider,
      eventId: `admin:${order.id}`,
      type: 'payment.succeeded',
      externalReference: reference,
      status: PaymentStatus.PAID,
    });

    const [item] = await this.decorate([await this.reload(order.id)]);

    await this.audit.record({
      action: 'payments.admin_confirm',
      actorUserId: actor.userId,
      entity: 'promotion_order',
      entityId: order.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        companyId: order.companyId,
        kind: item.kind,
        total: order.total,
        method: order.paymentMethod,
      },
    });

    await this.notifier.notifyCompany(order.companyId, {
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Pago confirmado',
      body:
        item.kind === 'PROMOTION'
          ? `Confirmamos tu pago. La promoción ${item.planName ?? ''} de «${item.vacancyTitle ?? 'tu vacante'}» ya está activa.`
          : `Confirmamos tu pago. Tu suscripción ${item.planName ?? ''} ya está activa.`,
      link: '/empresa/promociones',
    });

    return item;
  }

  async reject(
    orderId: string,
    reason: string | undefined,
    actor: BillingActor,
  ): Promise<AdminPaymentResponseDto> {
    const order = await this.requireOpenOrder(orderId);
    const reference = await this.ensureReference(order);

    // Un pago fallido deshace la reserva: la promoción o la suscripción pasan a
    // CANCELLED y la empresa queda libre para volver a contratar.
    await this.settle.execute({
      provider: order.provider,
      eventId: `admin:${order.id}`,
      type: 'payment.failed',
      externalReference: reference,
      status: PaymentStatus.FAILED,
    });

    const [item] = await this.decorate([await this.reload(order.id)]);
    const cleanReason = reason?.trim() || null;

    await this.audit.record({
      action: 'payments.admin_reject',
      actorUserId: actor.userId,
      entity: 'promotion_order',
      entityId: order.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        companyId: order.companyId,
        kind: item.kind,
        total: order.total,
        reason: cleanReason,
      },
    });

    await this.notifier.notifyCompany(order.companyId, {
      type: NotificationType.PAYMENT_REJECTED,
      title: 'No pudimos confirmar tu pago',
      body:
        `No confirmamos el pago de ${item.planName ?? 'tu plan'}` +
        (cleanReason ? `: ${cleanReason}.` : '.') +
        ' Puedes volver a contratarlo desde tu panel.',
      link: '/empresa/promociones',
    });

    return item;
  }

  // ------------------------------------------------------------- privados

  private async requireOpenOrder(orderId: string): Promise<PromotionOrder> {
    const order = await this.billing.findOrderById(orderId);
    if (!order) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PAYMENT_ORDER_NOT_FOUND,
        'La orden de pago no existe.',
      );
    }
    if (!OPEN_PAYMENT_STATUSES.includes(order.paymentStatus)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_NOT_PENDING,
        'Esta orden ya no está pendiente de pago.',
      );
    }
    return order;
  }

  /**
   * `SettlePaymentUseCase` localiza la orden por su referencia externa. Una
   * orden `PENDING` cuyo checkout falló a medias no la tiene, y sin esto no se
   * podría ni confirmar ni rechazar: se queda atascada para siempre.
   */
  private async ensureReference(order: PromotionOrder): Promise<string> {
    if (order.externalReference) return order.externalReference;
    order.externalReference = `admin_${order.id}`;
    await this.billing.saveOrder(order);
    return order.externalReference;
  }

  private async reload(orderId: string): Promise<PromotionOrder> {
    const order = await this.billing.findOrderById(orderId);
    if (!order) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'No se pudo releer la orden de pago.',
      );
    }
    return order;
  }

  /** Resuelve empresa, plan y vacante de cada orden, en lote. */
  private async decorate(
    rows: PromotionOrder[],
  ): Promise<AdminPaymentResponseDto[]> {
    if (rows.length === 0) return [];

    const unique = (values: (string | null | undefined)[]): string[] => [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ];

    const [promotions, subscriptions, companies, plans] = await Promise.all([
      this.billing.findPromotionsByIds(unique(rows.map((r) => r.promotionId))),
      this.billing.findSubscriptionsByIds(
        unique(rows.map((r) => r.subscriptionId)),
      ),
      this.companies.findByIds(unique(rows.map((r) => r.companyId))),
      // El catálogo de planes son unas pocas filas: traerlo entero es más
      // barato que un `IN` por página.
      this.plans.findAll(false),
    ]);
    const vacancies = await this.vacancies.findByIds(
      unique(promotions.map((p) => p.vacancyId)),
    );

    const promotionById = new Map(promotions.map((p) => [p.id, p]));
    const subscriptionById = new Map(subscriptions.map((s) => [s.id, s]));
    const companyById = new Map(companies.map((c) => [c.id, c]));
    const planById = new Map(plans.map((p) => [p.id, p]));
    const vacancyById = new Map(vacancies.map((v) => [v.id, v]));

    return rows.map((order) => {
      const subject: OrderSubject = {
        planName: null,
        vacancyId: null,
        vacancyTitle: null,
      };
      const promotion = order.promotionId
        ? promotionById.get(order.promotionId)
        : undefined;
      const subscription = order.subscriptionId
        ? subscriptionById.get(order.subscriptionId)
        : undefined;

      if (promotion) {
        subject.planName = planById.get(promotion.planId)?.name ?? null;
        subject.vacancyId = promotion.vacancyId;
        subject.vacancyTitle =
          vacancyById.get(promotion.vacancyId)?.title ?? null;
      } else if (subscription) {
        subject.planName = planById.get(subscription.planId)?.name ?? null;
      }

      return {
        ...toOrderResponse(order),
        kind: order.promotionId ? 'PROMOTION' : 'SUBSCRIPTION',
        companyId: order.companyId,
        companyName: companyById.get(order.companyId)?.businessName ?? null,
        ...subject,
        createdAt: order.createdAt.toISOString(),
      };
    });
  }
}
