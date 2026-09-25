import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import {
  PaymentProvider,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import {
  ParsedWebhook,
  PaymentEvent,
  PaymentProviderPort,
} from '@/modules/billing/services/payment-provider.port';
import { PaymentProviderRegistry } from '@/modules/billing/services/payment-provider.registry';
import { HandlePaymentWebhookUseCase } from '@/modules/billing/use-cases/handle-payment-webhook.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';

const PAYLOAD = Buffer.from('{}');

function paymentEvent(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    provider: PaymentProvider.STRIPE,
    eventId: 'evt_1',
    type: 'checkout.session.completed',
    externalReference: 'cs_1',
    status: PaymentStatus.PAID,
    ...overrides,
  };
}

describe('HandlePaymentWebhookUseCase', () => {
  let parsed: ParsedWebhook;
  let billing: jest.Mocked<IBillingRepository>;
  let settle: jest.Mocked<SettlePaymentUseCase>;
  let useCase: HandlePaymentWebhookUseCase;

  beforeEach(() => {
    parsed = { kind: 'payment', event: paymentEvent() };

    const provider = {
      parseEvent: jest.fn(() => Promise.resolve(parsed)),
    } as unknown as PaymentProviderPort;

    const registry = {
      forOrder: jest.fn((name: string) =>
        name === 'stripe' ? provider : null,
      ),
    } as unknown as PaymentProviderRegistry;

    billing = {
      findSubscriptionByProviderId: jest.fn().mockResolvedValue(
        Object.assign(new CompanySubscription(), {
          id: 'sub-local',
          companyId: 'company-1',
          planId: 'plan-anual',
          autoRenew: true,
        }),
      ),
      findOrderByExternalReference: jest.fn().mockResolvedValue(null),
      saveOrder: jest.fn((o: PromotionOrder) => Promise.resolve(o)),
      saveSubscription: jest.fn((s: CompanySubscription) => Promise.resolve(s)),
    } as unknown as jest.Mocked<IBillingRepository>;

    const plans = {
      findById: jest
        .fn()
        .mockResolvedValue(Object.assign(new Plan(), { taxRate: '0.1600' })),
    } as unknown as jest.Mocked<IPlanRepository>;

    settle = {
      execute: jest.fn().mockResolvedValue({
        applied: true,
        orderId: 'order-1',
        paymentStatus: PaymentStatus.PAID,
      }),
    } as unknown as jest.Mocked<SettlePaymentUseCase>;

    const audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    useCase = new HandlePaymentWebhookUseCase(
      billing,
      plans,
      registry,
      settle,
      audit,
    );
  });

  it('firma inválida → 400 PAYMENT_WEBHOOK_INVALID', async () => {
    parsed = { kind: 'invalid' };

    const error = await useCase
      .handle('stripe', PAYLOAD, 'sig')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppException);
    expect(
      ((error as AppException).getResponse() as { errorCode?: string })
        .errorCode,
    ).toBe(ErrorCode.PAYMENT_WEBHOOK_INVALID);
  });

  it('un proveedor desconocido también es inválido', async () => {
    await expect(
      useCase.handle('paypal', PAYLOAD, 'sig'),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('un evento que no interesa se acepta sin tocar nada', async () => {
    parsed = { kind: 'ignored', type: 'customer.created' };

    await expect(useCase.handle('stripe', PAYLOAD, 'sig')).resolves.toEqual({
      received: true,
      outcome: 'ignored',
    });
    expect(settle.execute).not.toHaveBeenCalled();
  });

  it('un pago pasa por SettlePaymentUseCase', async () => {
    await expect(useCase.handle('stripe', PAYLOAD, 'sig')).resolves.toEqual({
      received: true,
      outcome: 'applied',
    });
    expect(settle.execute).toHaveBeenCalledWith(
      expect.objectContaining({ externalReference: 'cs_1' }),
    );
  });

  it('una orden ajena responde 200 para que Stripe no reintente', async () => {
    settle.execute.mockRejectedValueOnce(
      new AppException(404, ErrorCode.PAYMENT_ORDER_NOT_FOUND, 'x'),
    );

    await expect(useCase.handle('stripe', PAYLOAD, 'sig')).resolves.toEqual({
      received: true,
      outcome: 'unknown_order',
    });
  });

  it('un fallo inesperado se propaga (500) para que Stripe reintente', async () => {
    settle.execute.mockRejectedValueOnce(new Error('BD caída'));

    await expect(useCase.handle('stripe', PAYLOAD, 'sig')).rejects.toThrow(
      'BD caída',
    );
  });

  describe('renovación', () => {
    beforeEach(() => {
      parsed = {
        kind: 'renewal',
        providerSubscriptionId: 'sub_123',
        amount: 11600,
        currency: 'MXN',
        event: paymentEvent({
          eventId: 'evt_inv',
          type: 'invoice.paid',
          externalReference: 'in_123',
          currentPeriodEnd: new Date('2028-01-01T00:00:00.000Z'),
        }),
      };
    });

    it('crea la orden del periodo con el IVA desglosado y la liquida', async () => {
      await useCase.handle('stripe', PAYLOAD, 'sig');

      expect(billing.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-local',
          companyId: 'company-1',
          externalReference: 'in_123',
          total: '11600.00',
          subtotal: '10000.00',
          taxAmount: '1600.00',
        }),
      );
      expect(settle.execute).toHaveBeenCalledWith(
        expect.objectContaining({ externalReference: 'in_123' }),
      );
    });

    it('un reintento reutiliza la orden en vez de duplicarla', async () => {
      billing.findOrderByExternalReference.mockResolvedValueOnce(
        Object.assign(new PromotionOrder(), { id: 'order-previa' }),
      );

      await useCase.handle('stripe', PAYLOAD, 'sig');

      expect(billing.saveOrder).not.toHaveBeenCalled();
      expect(settle.execute).toHaveBeenCalled();
    });

    it('sin suscripción local no crea nada', async () => {
      billing.findSubscriptionByProviderId.mockResolvedValueOnce(null);

      await expect(useCase.handle('stripe', PAYLOAD, 'sig')).resolves.toEqual({
        received: true,
        outcome: 'unknown_order',
      });
      expect(billing.saveOrder).not.toHaveBeenCalled();
    });
  });

  it('fin de suscripción en la pasarela apaga la renovación', async () => {
    parsed = {
      kind: 'subscription_ended',
      eventId: 'evt_del',
      providerSubscriptionId: 'sub_123',
    };

    await useCase.handle('stripe', PAYLOAD, 'sig');

    expect(billing.saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ autoRenew: false }),
    );
  });
});
