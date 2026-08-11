import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import {
  BillingPeriod,
  PaymentMethod,
  PaymentStatus,
  PlanType,
  PromotionStatus,
  SubscriptionStatus,
} from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import {
  EntitlementService,
  PlanEntitlements,
} from '@/modules/billing/services/entitlement.service';
import { PaymentEvent } from '@/modules/billing/services/payment-provider.port';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import { TalentGrantSource } from '@/modules/talent/enums/talent-access.enum';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const ENTITLEMENTS: PlanEntitlements = {
  verifiedPublication: true,
  featuredRanking: true,
  urgentConfidentialBadge: true,
  socialMediaDistribution: true,
  screeningQuestions: true,
  autoRejectionMessage: true,
  applicantContactData: true,
  aiCandidateMatching: true,
  aiJobCreation: false,
  pauseReactivate: 2,
  editTitleOnReactivate: true,
  talentVisits: 20,
  publicationDays: 60,
};

function order(overrides: Partial<PromotionOrder> = {}): PromotionOrder {
  return Object.assign(new PromotionOrder(), {
    id: 'order-1',
    promotionId: 'promo-1',
    subscriptionId: null,
    companyId: 'company-1',
    provider: 'manual',
    paymentMethod: PaymentMethod.CARD,
    paymentStatus: PaymentStatus.AWAITING_PAYMENT,
    subtotal: '1000.00',
    taxAmount: '160.00',
    total: '1160.00',
    currency: 'MXN',
    externalReference: 'manual_ref',
    installments: 1,
    ...overrides,
  });
}

function promotion(): VacancyPromotion {
  return Object.assign(new VacancyPromotion(), {
    id: 'promo-1',
    vacancyId: 'vac-1',
    planId: 'plan-1',
    companyId: 'company-1',
    purchasedBy: 'user-1',
    status: PromotionStatus.PENDING_PAYMENT,
    pricePaid: '1000.00',
    currency: 'MXN',
  });
}

function plan(): Plan {
  return Object.assign(new Plan(), {
    id: 'plan-1',
    code: 'ALTA',
    name: 'Alta',
    planType: PlanType.PER_PUBLICATION,
    basePrice: '1000.00',
    currency: 'MXN',
    taxRate: '0.1600',
    validityDays: 60,
    billingPeriod: BillingPeriod.ONE_TIME,
    isActive: true,
  });
}

function paidEvent(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    provider: 'manual',
    eventId: 'evt-1',
    type: 'payment.succeeded',
    externalReference: 'manual_ref',
    status: PaymentStatus.PAID,
    ...overrides,
  };
}

describe('SettlePaymentUseCase', () => {
  let dataSource: DataSource;
  let billing: jest.Mocked<IBillingRepository>;
  let plans: jest.Mocked<IPlanRepository>;
  let entitlements: jest.Mocked<EntitlementService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: SettlePaymentUseCase;
  let currentOrder: PromotionOrder;
  let currentPromotion: VacancyPromotion;

  beforeEach(() => {
    currentOrder = order();
    currentPromotion = promotion();

    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    billing = {
      registerEventOnce: jest.fn().mockResolvedValue(true),
      findOrderByExternalReference: jest.fn(() =>
        Promise.resolve(currentOrder),
      ),
      saveOrder: jest.fn((o: PromotionOrder) => Promise.resolve(o)),
      findPromotionById: jest.fn(() => Promise.resolve(currentPromotion)),
      savePromotion: jest.fn((p: VacancyPromotion) => Promise.resolve(p)),
      findSubscriptionById: jest.fn(),
      saveSubscription: jest.fn((s: CompanySubscription) => Promise.resolve(s)),
    } as unknown as jest.Mocked<IBillingRepository>;

    plans = {
      findById: jest.fn().mockResolvedValue(plan()),
    } as unknown as jest.Mocked<IPlanRepository>;

    entitlements = {
      resolve: jest.fn().mockResolvedValue(ENTITLEMENTS),
      applyToVacancy: jest.fn().mockResolvedValue({
        vacancy: {},
        endsAt: new Date('2026-10-10'),
      }),
      grantTalentVisits: jest.fn().mockResolvedValue({ id: 'grant-1' }),
      revokeFromVacancy: jest.fn(),
    } as unknown as jest.Mocked<EntitlementService>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new SettlePaymentUseCase(
      billing,
      plans,
      entitlements,
      audit,
      dataSource,
    );
  });

  describe('pago confirmado de una promoción', () => {
    it('activa la promoción, aplica beneficios y otorga el cupo de talento', async () => {
      const result = await useCase.execute(paidEvent());

      expect(result.applied).toBe(true);
      expect(currentOrder.paymentStatus).toBe(PaymentStatus.PAID);
      expect(currentOrder.paidAt).toBeInstanceOf(Date);

      expect(currentPromotion.status).toBe(PromotionStatus.ACTIVE);
      expect(currentPromotion.startsAt).toBeInstanceOf(Date);
      expect(currentPromotion.endsAt).toEqual(new Date('2026-10-10'));

      expect(entitlements.applyToVacancy).toHaveBeenCalledWith(
        'vac-1',
        expect.objectContaining({ id: 'plan-1' }),
        ENTITLEMENTS,
        expect.any(Date),
        expect.anything(),
      );

      // Esto es lo que desbloquea M12.
      expect(entitlements.grantTalentVisits).toHaveBeenCalledWith(
        'company-1',
        ENTITLEMENTS,
        TalentGrantSource.PROMOTION,
        'promo-1',
        new Date('2026-10-10'),
        expect.anything(),
      );
    });

    it('todo se aplica dentro de una sola transacción', async () => {
      await useCase.execute(paidEvent());

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(billing.savePromotion.mock.calls[0][1]).toBeDefined();
    });
  });

  describe('idempotencia', () => {
    it('descarta un evento ya procesado sin tocar nada', async () => {
      billing.registerEventOnce.mockResolvedValue(false);

      const result = await useCase.execute(paidEvent());

      expect(result).toEqual({
        applied: false,
        orderId: null,
        paymentStatus: null,
      });
      expect(billing.saveOrder).not.toHaveBeenCalled();
      expect(entitlements.grantTalentVisits).not.toHaveBeenCalled();
    });

    it('registra el evento antes de leer la orden', async () => {
      await useCase.execute(paidEvent());

      const registerOrder =
        billing.registerEventOnce.mock.invocationCallOrder[0];
      const findOrder =
        billing.findOrderByExternalReference.mock.invocationCallOrder[0];
      expect(registerOrder).toBeLessThan(findOrder);
    });

    it('rechaza volver a cobrar una orden ya pagada', async () => {
      currentOrder = order({ paymentStatus: PaymentStatus.PAID });

      try {
        await useCase.execute(paidEvent({ eventId: 'evt-2' }));
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.PAYMENT_ALREADY_SETTLED);
      }
      expect(entitlements.grantTalentVisits).not.toHaveBeenCalled();
    });
  });

  describe('pago fallido', () => {
    it('cancela la promoción y no otorga nada', async () => {
      await useCase.execute(
        paidEvent({ status: PaymentStatus.FAILED, type: 'payment.failed' }),
      );

      expect(currentPromotion.status).toBe(PromotionStatus.CANCELLED);
      expect(entitlements.applyToVacancy).not.toHaveBeenCalled();
      expect(entitlements.grantTalentVisits).not.toHaveBeenCalled();
    });
  });

  describe('suscripción', () => {
    it('activa, fija el fin de periodo y recarga el cupo', async () => {
      const subscription = Object.assign(new CompanySubscription(), {
        id: 'sub-1',
        companyId: 'company-1',
        planId: 'plan-1',
        status: SubscriptionStatus.PENDING_PAYMENT,
        autoRenew: true,
      });
      currentOrder = order({ promotionId: null, subscriptionId: 'sub-1' });
      billing.findSubscriptionById.mockResolvedValue(subscription);

      const periodEnd = new Date('2027-08-11');
      await useCase.execute(paidEvent({ currentPeriodEnd: periodEnd }));

      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(subscription.currentPeriodEnd).toEqual(periodEnd);
      expect(entitlements.grantTalentVisits).toHaveBeenCalledWith(
        'company-1',
        ENTITLEMENTS,
        TalentGrantSource.SUBSCRIPTION,
        'sub-1',
        periodEnd,
        expect.anything(),
      );
    });

    it('sin fin de periodo del proveedor, asume un año', async () => {
      const subscription = Object.assign(new CompanySubscription(), {
        id: 'sub-1',
        companyId: 'company-1',
        planId: 'plan-1',
        status: SubscriptionStatus.PENDING_PAYMENT,
      });
      currentOrder = order({ promotionId: null, subscriptionId: 'sub-1' });
      billing.findSubscriptionById.mockResolvedValue(subscription);

      await useCase.execute(paidEvent());

      const end = subscription.currentPeriodEnd as Date;
      expect(end.getFullYear()).toBe(new Date().getFullYear() + 1);
    });
  });

  it('404 si la referencia no corresponde a ninguna orden', async () => {
    billing.findOrderByExternalReference.mockResolvedValue(null);

    try {
      await useCase.execute(paidEvent({ externalReference: 'no-existe' }));
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.PAYMENT_ORDER_NOT_FOUND);
    }
  });
});
