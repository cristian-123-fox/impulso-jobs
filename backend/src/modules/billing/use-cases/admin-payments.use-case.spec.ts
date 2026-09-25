import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import { CompanySubscriptionNotifier } from '@/modules/billing/services/company-subscription-notifier.service';
import { PaymentProviderRegistry } from '@/modules/billing/services/payment-provider.registry';
import { AdminPaymentsUseCase } from '@/modules/billing/use-cases/admin-payments.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import { Company } from '@/modules/companies/entities/company.entity';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';

const ACTOR = { userId: 'admin-1', ip: '127.0.0.1', userAgent: 'jest' };

function order(overrides: Partial<PromotionOrder> = {}): PromotionOrder {
  return Object.assign(new PromotionOrder(), {
    id: 'order-1',
    companyId: 'company-1',
    promotionId: 'promo-1',
    subscriptionId: null,
    provider: 'manual',
    paymentMethod: PaymentMethod.SPEI,
    paymentStatus: PaymentStatus.AWAITING_PAYMENT,
    subtotal: '1000.00',
    taxAmount: '160.00',
    total: '1160.00',
    currency: 'MXN',
    installments: 1,
    externalReference: 'manual_abc',
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    ...overrides,
  });
}

describe('AdminPaymentsUseCase', () => {
  let billing: jest.Mocked<IBillingRepository>;
  let settle: jest.Mocked<SettlePaymentUseCase>;
  let notifier: jest.Mocked<CompanySubscriptionNotifier>;
  let audit: jest.Mocked<AuditService>;
  let useCase: AdminPaymentsUseCase;
  /** Estado de la orden tal como lo dejaría `SettlePaymentUseCase`. */
  let current: PromotionOrder;

  beforeEach(() => {
    current = order();

    billing = {
      findOrderById: jest.fn(() => Promise.resolve(current)),
      saveOrder: jest.fn((o: PromotionOrder) => Promise.resolve(o)),
      findAndCountOrders: jest.fn(() => Promise.resolve([[current], 1])),
      findPromotionsByIds: jest.fn().mockResolvedValue([
        Object.assign(new VacancyPromotion(), {
          id: 'promo-1',
          planId: 'plan-alta',
          vacancyId: 'vac-1',
        }),
      ]),
      findSubscriptionsByIds: jest.fn().mockResolvedValue([
        Object.assign(new CompanySubscription(), {
          id: 'sub-1',
          planId: 'plan-anual',
        }),
      ]),
    } as unknown as jest.Mocked<IBillingRepository>;

    const plans = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          Object.assign(new Plan(), { id: 'plan-alta', name: 'Alta' }),
          Object.assign(new Plan(), { id: 'plan-anual', name: 'Anual' }),
        ]),
    } as unknown as jest.Mocked<IPlanRepository>;

    const companies = {
      findByIds: jest.fn().mockResolvedValue([
        Object.assign(new Company(), {
          id: 'company-1',
          businessName: 'Acme',
        }),
      ]),
    } as unknown as jest.Mocked<ICompanyRepository>;

    const vacancies = {
      findByIds: jest
        .fn()
        .mockResolvedValue([
          Object.assign(new Vacancy(), { id: 'vac-1', title: 'Contador' }),
        ]),
    } as unknown as jest.Mocked<IVacancyRepository>;

    settle = {
      execute: jest.fn((event: { status: PaymentStatus }) => {
        current = order({ ...current, paymentStatus: event.status });
        return Promise.resolve({
          applied: true,
          orderId: current.id,
          paymentStatus: event.status,
        });
      }),
    } as unknown as jest.Mocked<SettlePaymentUseCase>;

    notifier = {
      notifyCompany: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<CompanySubscriptionNotifier>;

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    useCase = new AdminPaymentsUseCase(
      billing,
      plans,
      companies,
      vacancies,
      settle,
      notifier,
      audit,
      {
        forOrder: jest.fn().mockReturnValue({ cancel: jest.fn() }),
      } as unknown as PaymentProviderRegistry,
    );
  });

  describe('list', () => {
    it('OPEN filtra por PENDING y AWAITING_PAYMENT', async () => {
      await useCase.list({ status: 'OPEN', page: 1, limit: 10 });

      expect(billing.findAndCountOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: [PaymentStatus.PENDING, PaymentStatus.AWAITING_PAYMENT],
        }),
      );
    });

    it('sin estado no filtra', async () => {
      await useCase.list({ page: 1, limit: 10 });

      expect(billing.findAndCountOrders).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: [] }),
      );
    });

    it('resuelve empresa, plan y vacante de una promoción', async () => {
      const result = await useCase.list({ page: 1, limit: 10 });

      expect(result.items[0]).toMatchObject({
        kind: 'PROMOTION',
        companyName: 'Acme',
        planName: 'Alta',
        vacancyId: 'vac-1',
        vacancyTitle: 'Contador',
        total: 1160,
      });
    });

    it('una orden de suscripción no trae vacante', async () => {
      current = order({ promotionId: null, subscriptionId: 'sub-1' });

      const result = await useCase.list({ page: 1, limit: 10 });

      expect(result.items[0]).toMatchObject({
        kind: 'SUBSCRIPTION',
        planName: 'Anual',
        vacancyId: null,
      });
    });
  });

  describe('confirm', () => {
    it('liquida por SettlePaymentUseCase con un evento idempotente por orden', async () => {
      const result = await useCase.confirm('order-1', ACTOR);

      expect(settle.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'admin:order-1',
          externalReference: 'manual_abc',
          status: PaymentStatus.PAID,
        }),
      );
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.admin_confirm',
          actorUserId: 'admin-1',
        }),
      );
      expect(notifier.notifyCompany).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ type: NotificationType.PAYMENT_CONFIRMED }),
      );
    });

    it('rechaza una orden que ya no está abierta', async () => {
      current = order({ paymentStatus: PaymentStatus.PAID });

      const error = await useCase
        .confirm('order-1', ACTOR)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect(
        ((error as AppException).getResponse() as { errorCode?: string })
          .errorCode,
      ).toBe(ErrorCode.PAYMENT_NOT_PENDING);
      expect(settle.execute).not.toHaveBeenCalled();
    });

    it('404 si la orden no existe', async () => {
      billing.findOrderById.mockResolvedValueOnce(null);

      await expect(useCase.confirm('nope', ACTOR)).rejects.toBeInstanceOf(
        AppException,
      );
      expect(settle.execute).not.toHaveBeenCalled();
    });

    it('da referencia a una orden que se quedó sin ella', async () => {
      current = order({
        paymentStatus: PaymentStatus.PENDING,
        externalReference: null,
      });

      await useCase.confirm('order-1', ACTOR);

      expect(billing.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ externalReference: 'admin_order-1' }),
      );
      expect(settle.execute).toHaveBeenCalledWith(
        expect.objectContaining({ externalReference: 'admin_order-1' }),
      );
    });
  });

  describe('reject', () => {
    it('liquida como FAILED y avisa a la empresa con el motivo', async () => {
      const result = await useCase.reject(
        'order-1',
        '  No llegó la transferencia  ',
        ACTOR,
      );

      expect(settle.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'admin:order-1',
          status: PaymentStatus.FAILED,
        }),
      );
      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.admin_reject',
          metadata: expect.objectContaining({
            reason: 'No llegó la transferencia',
          }) as unknown,
        }),
      );
      expect(notifier.notifyCompany).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          type: NotificationType.PAYMENT_REJECTED,
          body: expect.stringContaining('No llegó la transferencia') as unknown,
        }),
      );
    });
  });
});
