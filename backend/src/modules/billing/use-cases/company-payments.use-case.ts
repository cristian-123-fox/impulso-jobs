import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  OrderResponseDto,
  toOrderResponse,
} from '@/modules/billing/dto/billing-response.dto';
import {
  OPEN_PAYMENT_STATUSES,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import { PaymentProviderRegistry } from '@/modules/billing/services/payment-provider.registry';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

/**
 * La empresa retira un cobro que abrió y no completó: volvió de Stripe con
 * "cancelar", o se arrepintió de una solicitud de pago.
 *
 * Sin esto, la reserva (la promoción o la suscripción pendiente) bloquearía la
 * compra hasta que caducara la sesión de Stripe —una hora— o, en una
 * solicitud, hasta que alguien del equipo la rechazara.
 *
 * Pasa por `SettlePaymentUseCase` como un pago fallido: es lo que deshace la
 * reserva, con las mismas reglas que un webhook de caducidad. El evento es
 * `cancel:<orderId>`, así que repetirlo no hace nada.
 */
@Injectable()
export class CompanyPaymentsUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    private readonly providers: PaymentProviderRegistry,
    private readonly settle: SettlePaymentUseCase,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async cancel(
    orderId: string,
    actor: BillingActor,
  ): Promise<OrderResponseDto> {
    const company = await this.ownership.requireCompany(actor.userId);
    const order = await this.billing.findOrderById(orderId);
    // Una orden ajena responde igual que una inexistente: no se confirma que
    // exista un id de otra empresa.
    if (!order || order.companyId !== company.id) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PAYMENT_ORDER_NOT_FOUND,
        'La orden de pago no existe.',
      );
    }
    if (!OPEN_PAYMENT_STATUSES.includes(order.paymentStatus)) {
      // Volver del Checkout con "cancelar" después de que el pago ya se
      // resolviera (p. ej. dos pestañas) no es un error para la empresa.
      return toOrderResponse(order);
    }

    if (!order.externalReference) {
      order.externalReference = `cancel_${order.id}`;
      await this.billing.saveOrder(order);
    }
    await this.providers
      .forOrder(order.provider)
      ?.cancel(order.externalReference);

    await this.settle.execute({
      provider: order.provider,
      eventId: `cancel:${order.id}`,
      type: 'checkout.cancelled',
      externalReference: order.externalReference,
      status: PaymentStatus.FAILED,
    });

    await this.audit.record({
      action: 'payments.company_cancel',
      actorUserId: actor.userId,
      entity: 'promotion_order',
      entityId: order.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { provider: order.provider, total: order.total },
    });

    const reloaded = await this.billing.findOrderById(order.id);
    return toOrderResponse(reloaded ?? order);
  }
}
