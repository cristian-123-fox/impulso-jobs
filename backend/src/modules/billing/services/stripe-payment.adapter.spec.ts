import Stripe from 'stripe';
import {
  PaymentMethod,
  PaymentStatus,
} from '@/modules/billing/enums/billing.enums';
import { StripePaymentAdapter } from '@/modules/billing/services/stripe-payment.adapter';

const SECRET = 'whsec_test_secret';

/**
 * Firma un evento igual que Stripe, sin red: `generateTestHeaderString` usa el
 * mismo HMAC que verifica `constructEvent`.
 */
function signed(event: object): { payload: Buffer; signature: string } {
  const body = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: SECRET,
  });
  return { payload: Buffer.from(body), signature };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    payment_status: 'paid',
    status: 'complete',
    subscription: null,
    ...overrides,
  };
}

describe('StripePaymentAdapter', () => {
  const env = { ...process.env };
  let adapter: StripePaymentAdapter;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    adapter = new StripePaymentAdapter();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it('sin clave secreta queda deshabilitado', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(new StripePaymentAdapter().enabled).toBe(false);
  });

  it('una suscripción sólo se cobra con tarjeta; SPEI nunca va por Stripe', () => {
    expect(adapter.supportedMethods(true)).toEqual([PaymentMethod.CARD]);
    expect(adapter.supportedMethods(false)).not.toContain(PaymentMethod.SPEI);
  });

  describe('parseEvent', () => {
    it('rechaza una firma que no cuadra', async () => {
      const { payload } = signed({ id: 'evt_1', type: 'ping' });
      await expect(
        adapter.parseEvent(payload, 't=1,v1=deadbeef'),
      ).resolves.toEqual({ kind: 'invalid' });
    });

    it('rechaza un webhook sin firma', async () => {
      const { payload } = signed({ id: 'evt_1', type: 'ping' });
      await expect(adapter.parseEvent(payload)).resolves.toEqual({
        kind: 'invalid',
      });
    });

    it('checkout pagado → PAID, con el id de la suscripción', async () => {
      const { payload, signature } = signed({
        id: 'evt_paid',
        type: 'checkout.session.completed',
        data: { object: session({ subscription: 'sub_123' }) },
      });

      const parsed = await adapter.parseEvent(payload, signature);

      expect(parsed).toEqual({
        kind: 'payment',
        event: expect.objectContaining({
          eventId: 'evt_paid',
          externalReference: 'cs_test_123',
          status: PaymentStatus.PAID,
          providerSubscriptionId: 'sub_123',
        }) as unknown,
      });
    });

    it('un vale OXXO emitido no activa: la orden sigue esperando', async () => {
      const { payload, signature } = signed({
        id: 'evt_oxxo',
        type: 'checkout.session.completed',
        data: { object: session({ payment_status: 'unpaid' }) },
      });

      const parsed = await adapter.parseEvent(payload, signature);

      expect(parsed).toMatchObject({
        kind: 'payment',
        event: { status: PaymentStatus.AWAITING_PAYMENT },
      });
    });

    it('sesión caducada → FAILED (libera la reserva)', async () => {
      const { payload, signature } = signed({
        id: 'evt_exp',
        type: 'checkout.session.expired',
        data: {
          object: session({ status: 'expired', payment_status: 'unpaid' }),
        },
      });

      await expect(
        adapter.parseEvent(payload, signature),
      ).resolves.toMatchObject({
        kind: 'payment',
        event: { status: PaymentStatus.FAILED },
      });
    });

    it('invoice.paid de renovación → renewal con importe y fin de periodo', async () => {
      const { payload, signature } = signed({
        id: 'evt_inv',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123',
            object: 'invoice',
            billing_reason: 'subscription_cycle',
            subscription: 'sub_123',
            amount_paid: 1160000,
            currency: 'mxn',
            lines: { data: [{ period: { end: 1830000000 } }] },
          },
        },
      });

      const parsed = await adapter.parseEvent(payload, signature);

      expect(parsed).toMatchObject({
        kind: 'renewal',
        providerSubscriptionId: 'sub_123',
        amount: 11600,
        currency: 'MXN',
        event: {
          externalReference: 'in_123',
          status: PaymentStatus.PAID,
          currentPeriodEnd: new Date(1830000000 * 1000),
        },
      });
    });

    it('el primer invoice.paid lo cubre el checkout: se ignora', async () => {
      const { payload, signature } = signed({
        id: 'evt_inv0',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_0',
            object: 'invoice',
            billing_reason: 'subscription_create',
            subscription: 'sub_123',
            amount_paid: 1160000,
            currency: 'mxn',
            lines: { data: [] },
          },
        },
      });

      await expect(adapter.parseEvent(payload, signature)).resolves.toEqual({
        kind: 'ignored',
        type: 'invoice.paid',
      });
    });

    it('customer.subscription.deleted → subscription_ended', async () => {
      const { payload, signature } = signed({
        id: 'evt_del',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_123', object: 'subscription' } },
      });

      await expect(adapter.parseEvent(payload, signature)).resolves.toEqual({
        kind: 'subscription_ended',
        eventId: 'evt_del',
        providerSubscriptionId: 'sub_123',
      });
    });
  });
});
