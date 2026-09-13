import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  BillingPeriod,
  PaymentMethod,
  PaymentStatus,
  PlanType,
  SubscriptionStatus,
} from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import { CompanySubscriptionNotifier } from '@/modules/billing/services/company-subscription-notifier.service';
import { PaymentProviderPort } from '@/modules/billing/services/payment-provider.port';
import { PricingService } from '@/modules/billing/services/pricing.service';
import { AdminSubscriptionUseCase } from '@/modules/billing/use-cases/admin-subscription.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import { Company } from '@/modules/companies/entities/company.entity';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import { TalentGrantSource } from '@/modules/talent/enums/talent-access.enum';
import { ITalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository.interface';

const ACTOR = { userId: 'admin-1', ip: '127.0.0.1', userAgent: 'jest' };
const COMPANY_ID = 'company-1';

function plan(overrides: Partial<Plan> = {}): Plan {
  return Object.assign(new Plan(), {
    id: 'plan-anual',
    code: 'ANUAL',
    name: 'Anual',
    planType: PlanType.ANNUAL_SUBSCRIPTION,
    billingPeriod: BillingPeriod.ANNUAL,
    basePrice: '10000.00',
    taxRate: '0.1600',
    currency: 'MXN',
    isActive: true,
    ...overrides,
  });
}

function liveSubscription(
  overrides: Partial<CompanySubscription> = {},
): CompanySubscription {
  return Object.assign(new CompanySubscription(), {
    id: 'sub-vieja',
    companyId: COMPANY_ID,
    planId: 'plan-viejo',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    autoRenew: true,
    ...overrides,
  });
}

function grant(overrides: Partial<TalentAccessGrant> = {}): TalentAccessGrant {
  return Object.assign(new TalentAccessGrant(), {
    id: 'grant-1',
    companyId: COMPANY_ID,
    sourceType: TalentGrantSource.SUBSCRIPTION,
    sourceId: 'sub-vieja',
    totalVisits: 50,
    usedVisits: 3,
    expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('AdminSubscriptionUseCase', () => {
  let billing: jest.Mocked<IBillingRepository>;
  let plans: jest.Mocked<IPlanRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let talent: jest.Mocked<ITalentAccessRepository>;
  let payments: jest.Mocked<PaymentProviderPort>;
  let settle: jest.Mocked<SettlePaymentUseCase>;
  let notifier: jest.Mocked<CompanySubscriptionNotifier>;
  let audit: jest.Mocked<AuditService>;
  let useCase: AdminSubscriptionUseCase;
  /** Suscripciones guardadas, indexadas por id, para simular la relectura. */
  let stored: Map<string, CompanySubscription>;

  beforeEach(() => {
    stored = new Map<string, CompanySubscription>();

    billing = {
      findLiveSubscriptionByCompany: jest.fn().mockResolvedValue(null),
      findSubscriptionById: jest.fn((id: string) =>
        Promise.resolve(stored.get(id) ?? null),
      ),
      saveSubscription: jest.fn((sub: CompanySubscription) => {
        sub.id ??= 'sub-nueva';
        stored.set(sub.id, sub);
        return Promise.resolve(sub);
      }),
      saveOrder: jest.fn((order: PromotionOrder) => {
        order.id ??= 'order-1';
        return Promise.resolve(order);
      }),
    } as unknown as jest.Mocked<IBillingRepository>;

    plans = {
      findById: jest.fn().mockResolvedValue(plan()),
    } as unknown as jest.Mocked<IPlanRepository>;

    companies = {
      findById: jest
        .fn()
        .mockResolvedValue(Object.assign(new Company(), { id: COMPANY_ID })),
    } as unknown as jest.Mocked<ICompanyRepository>;

    talent = {
      findActiveGrants: jest.fn().mockResolvedValue([]),
      saveGrant: jest.fn((g: TalentAccessGrant) => Promise.resolve(g)),
    } as unknown as jest.Mocked<ITalentAccessRepository>;

    payments = {
      name: 'manual',
      createCheckout: jest.fn().mockResolvedValue({
        externalReference: 'manual_ref',
        checkoutUrl: null,
        status: PaymentStatus.AWAITING_PAYMENT,
        voucher: null,
      }),
    } as unknown as jest.Mocked<PaymentProviderPort>;

    // Liquidar activa la suscripción: se reproduce sobre la fila guardada.
    settle = {
      execute: jest.fn((event: { currentPeriodEnd?: Date | null }) => {
        const sub = stored.get('sub-nueva');
        if (sub) {
          sub.status = SubscriptionStatus.ACTIVE;
          sub.startsAt = new Date();
          sub.currentPeriodEnd = event.currentPeriodEnd ?? null;
        }
        return Promise.resolve({
          applied: true,
          orderId: 'order-1',
          paymentStatus: PaymentStatus.PAID,
        });
      }),
    } as unknown as jest.Mocked<SettlePaymentUseCase>;

    notifier = {
      notifyCompany: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<CompanySubscriptionNotifier>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new AdminSubscriptionUseCase(
      billing,
      plans,
      companies,
      talent,
      payments,
      new PricingService(),
      settle,
      notifier,
      audit,
    );
  });

  describe('assign', () => {
    it('liquida por SettlePaymentUseCase en vez de activar a mano', async () => {
      const result = await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Venta cerrada por transferencia.',
        actor: ACTOR,
      });

      expect(settle.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          externalReference: 'manual_ref',
          status: PaymentStatus.PAID,
        }),
      );
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('registra la venta con el precio del plan y su IVA', async () => {
      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Venta al precio de lista.',
        actor: ACTOR,
      });

      const order = billing.saveOrder.mock.calls[0][0];
      expect(order.subtotal).toBe('10000.00');
      expect(order.taxAmount).toBe('1600.00');
      expect(order.total).toBe('11600.00');
      expect(order.paymentMethod).toBe(PaymentMethod.SPEI);
    });

    it('recalcula el IVA cuando el administrador corrige el importe', async () => {
      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        amount: 8000,
        reason: 'Descuento negociado del 20%.',
        actor: ACTOR,
      });

      const order = billing.saveOrder.mock.calls[0][0];
      expect(order.subtotal).toBe('8000.00');
      expect(order.taxAmount).toBe('1280.00');
      expect(order.total).toBe('9280.00');
    });

    it('vence a un año si no se indica fecha', async () => {
      const before = new Date();
      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Alta anual estándar.',
        actor: ACTOR,
      });

      const event = settle.execute.mock.calls[0][0];
      const expected = new Date(before);
      expected.setFullYear(expected.getFullYear() + 1);
      expect(event.currentPeriodEnd?.getFullYear()).toBe(
        expected.getFullYear(),
      );
    });

    it('rechaza una fecha de vencimiento pasada', async () => {
      await expect(
        useCase.assign({
          companyId: COMPANY_ID,
          planId: 'plan-anual',
          currentPeriodEnd: '2020-01-01T00:00:00.000Z',
          reason: 'Fecha equivocada.',
          actor: ACTOR,
        }),
      ).rejects.toThrow('La fecha de vencimiento debe ser posterior a hoy.');
      expect(settle.execute).not.toHaveBeenCalled();
    });

    it('cambiar de plan cierra el cupo del anterior y no lo acumula', async () => {
      const previous = liveSubscription();
      const previousGrant = grant();
      billing.findLiveSubscriptionByCompany.mockResolvedValue(previous);
      talent.findActiveGrants.mockResolvedValue([previousGrant]);

      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Sube de plan Media a Anual.',
        actor: ACTOR,
      });

      expect(previous.status).toBe(SubscriptionStatus.CANCELLED);
      expect(previous.autoRenew).toBe(false);
      expect(talent.saveGrant).toHaveBeenCalledWith(previousGrant);
      expect(previousGrant.expiresAt?.getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('no toca los cupos de otra fuente al cambiar de plan', async () => {
      billing.findLiveSubscriptionByCompany.mockResolvedValue(
        liveSubscription(),
      );
      const fromPromotion = grant({
        id: 'grant-promo',
        sourceType: TalentGrantSource.PROMOTION,
        sourceId: 'promo-1',
      });
      talent.findActiveGrants.mockResolvedValue([fromPromotion]);

      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Cambio de plan.',
        actor: ACTOR,
      });

      expect(talent.saveGrant).not.toHaveBeenCalled();
    });

    it('acepta un plan retirado del escaparate', async () => {
      plans.findById.mockResolvedValue(plan({ isActive: false }));

      await expect(
        useCase.assign({
          companyId: COMPANY_ID,
          planId: 'plan-anual',
          reason: 'Cliente antiguo conserva su plan.',
          actor: ACTOR,
        }),
      ).resolves.toBeDefined();
    });

    it('anota en auditoría cuando se asigna un plan por publicación', async () => {
      plans.findById.mockResolvedValue(
        plan({ planType: PlanType.PER_PUBLICATION }),
      );

      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Cortesía comercial.',
        actor: ACTOR,
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            assignedPerPublicationPlan: true,
          }),
        }),
      );
    });

    it('audita con el motivo y avisa a la empresa', async () => {
      await useCase.assign({
        companyId: COMPANY_ID,
        planId: 'plan-anual',
        reason: 'Venta cerrada, folio 8891.',
        actor: ACTOR,
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscriptions.admin_assign',
          actorUserId: 'admin-1',
          metadata: expect.objectContaining({
            reason: 'Venta cerrada, folio 8891.',
          }),
        }),
      );
      expect(notifier.notifyCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.objectContaining({
          type: NotificationType.SUBSCRIPTION_ASSIGNED,
        }),
      );
    });

    it('falla si la empresa no existe', async () => {
      companies.findById.mockResolvedValue(null);

      await expect(
        useCase.assign({
          companyId: 'fantasma',
          planId: 'plan-anual',
          reason: 'No debería llegar aquí.',
          actor: ACTOR,
        }),
      ).rejects.toThrow('La empresa no existe.');
    });
  });

  describe('update', () => {
    it('arrastra el cupo al prorrogar la vigencia', async () => {
      const subscription = liveSubscription({ id: 'sub-1' });
      const active = grant({ sourceId: 'sub-1' });
      billing.findLiveSubscriptionByCompany.mockResolvedValue(subscription);
      talent.findActiveGrants.mockResolvedValue([active]);

      const newEnd = '2028-01-01T00:00:00.000Z';
      await useCase.update({
        companyId: COMPANY_ID,
        currentPeriodEnd: newEnd,
        reason: 'Prórroga por incidencia de soporte.',
        actor: ACTOR,
      });

      expect(subscription.currentPeriodEnd?.toISOString()).toBe(newEnd);
      expect(active.expiresAt?.toISOString()).toBe(newEnd);
    });

    it('exige al menos un campo', async () => {
      await expect(
        useCase.update({
          companyId: COMPANY_ID,
          reason: 'Sin cambios.',
          actor: ACTOR,
        }),
      ).rejects.toThrow(
        'Indica al menos la nueva vigencia o la renovación automática.',
      );
    });

    it('falla si la empresa no tiene suscripción vigente', async () => {
      billing.findLiveSubscriptionByCompany.mockResolvedValue(null);

      await expect(
        useCase.update({
          companyId: COMPANY_ID,
          autoRenew: false,
          reason: 'Apagar renovación.',
          actor: ACTOR,
        }),
      ).rejects.toThrow('Esta empresa no tiene ninguna suscripción vigente.');
    });
  });

  describe('revoke', () => {
    it('cancela la suscripción pero respeta los cupos ya concedidos', async () => {
      const subscription = liveSubscription({ id: 'sub-1' });
      billing.findLiveSubscriptionByCompany.mockResolvedValue(subscription);
      talent.findActiveGrants.mockResolvedValue([grant({ sourceId: 'sub-1' })]);

      await useCase.revoke({
        companyId: COMPANY_ID,
        reason: 'Cliente pidió la baja.',
        actor: ACTOR,
      });

      expect(subscription.status).toBe(SubscriptionStatus.CANCELLED);
      expect(subscription.autoRenew).toBe(false);
      // Decisión N13: retirar no recorta lo ya concedido.
      expect(talent.saveGrant).not.toHaveBeenCalled();
    });

    it('audita el motivo y avisa a la empresa', async () => {
      billing.findLiveSubscriptionByCompany.mockResolvedValue(
        liveSubscription({ id: 'sub-1' }),
      );

      await useCase.revoke({
        companyId: COMPANY_ID,
        reason: 'Impago tras tres avisos.',
        actor: ACTOR,
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscriptions.admin_revoke',
          metadata: expect.objectContaining({
            reason: 'Impago tras tres avisos.',
          }),
        }),
      );
      expect(notifier.notifyCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.objectContaining({
          type: NotificationType.SUBSCRIPTION_REVOKED,
        }),
      );
    });
  });
});
