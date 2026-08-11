import { Plan } from '@/modules/billing/entities/plan.entity';
import {
  BillingPeriod,
  PaymentMethod,
  PlanType,
} from '@/modules/billing/enums/billing.enums';
import { PricingService } from '@/modules/billing/services/pricing.service';

function plan(basePrice: number): Plan {
  return Object.assign(new Plan(), {
    id: 'plan-1',
    code: 'ALTA',
    name: 'Alta',
    planType: PlanType.PER_PUBLICATION,
    basePrice: basePrice.toFixed(2),
    currency: 'MXN',
    taxRate: '0.1600',
    billingPeriod: BillingPeriod.ONE_TIME,
  });
}

describe('PricingService', () => {
  const pricing = new PricingService();

  describe('breakdown', () => {
    it('aplica el IVA del 16 %', () => {
      expect(pricing.breakdown(plan(1000))).toEqual({
        subtotal: 1000,
        taxRate: 0.16,
        taxAmount: 160,
        total: 1160,
        currency: 'MXN',
      });
    });

    it('redondea a dos decimales sin arrastrar error de coma flotante', () => {
      const result = pricing.breakdown(plan(1999.99));

      expect(result.taxAmount).toBe(320);
      expect(result.total).toBe(2319.99);
    });

    it('un plan gratuito no genera IVA', () => {
      const result = pricing.breakdown(plan(0));

      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('toCents', () => {
    it('convierte pesos a centavos', () => {
      expect(pricing.toCents(1160)).toBe(116000);
      expect(pricing.toCents(2319.99)).toBe(231999);
    });

    it('no pierde el último centavo por redondeo binario', () => {
      expect(pricing.toCents(1.005)).toBe(101);
      expect(pricing.toCents(0.07)).toBe(7);
    });
  });

  describe('availableMethods', () => {
    it('OXXO sirve dentro del rango permitido', () => {
      const oxxo = pricing.isMethodAvailable(PaymentMethod.OXXO, 5000, false);

      expect(oxxo.available).toBe(true);
      expect(oxxo.reason).toBeNull();
    });

    it('OXXO se bloquea por encima de $10,000 MXN', () => {
      const oxxo = pricing.isMethodAvailable(PaymentMethod.OXXO, 10_001, false);

      expect(oxxo.available).toBe(false);
      expect(oxxo.reason).toContain('máximo');
    });

    it('OXXO se bloquea por debajo de $10 MXN', () => {
      const oxxo = pricing.isMethodAvailable(PaymentMethod.OXXO, 9.99, false);

      expect(oxxo.available).toBe(false);
      expect(oxxo.reason).toContain('mínimo');
    });

    it('OXXO nunca sirve para una suscripción', () => {
      const oxxo = pricing.isMethodAvailable(PaymentMethod.OXXO, 5000, true);

      expect(oxxo.available).toBe(false);
      expect(oxxo.reason).toContain('recurrentes');
    });

    it('MSI no aplica a una suscripción', () => {
      expect(
        pricing.isMethodAvailable(PaymentMethod.MSI, 5000, true).available,
      ).toBe(false);
      expect(
        pricing.isMethodAvailable(PaymentMethod.MSI, 5000, false).available,
      ).toBe(true);
    });

    it('tarjeta y SPEI sirven siempre', () => {
      for (const recurring of [true, false]) {
        expect(
          pricing.isMethodAvailable(PaymentMethod.CARD, 50_000, recurring)
            .available,
        ).toBe(true);
        expect(
          pricing.isMethodAvailable(PaymentMethod.SPEI, 50_000, recurring)
            .available,
        ).toBe(true);
      }
    });

    it('el listado cubre los cuatro métodos', () => {
      expect(pricing.availableMethods(1000, false)).toHaveLength(4);
    });
  });
});
