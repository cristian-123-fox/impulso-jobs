import { Injectable } from '@nestjs/common';
import {
  OXXO_MAX_AMOUNT,
  OXXO_MIN_AMOUNT,
  PaymentMethod,
} from '@/modules/billing/enums/billing.enums';
import { Plan } from '@/modules/billing/entities/plan.entity';

/** Desglose de un cobro, en pesos. */
export interface PriceBreakdown {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

/** Por qué un método de pago no está disponible para un importe. */
export interface MethodAvailability {
  method: PaymentMethod;
  available: boolean;
  reason: string | null;
}

/** Redondeo a dos decimales sin arrastrar el error binario de coma flotante. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Cálculo de precios e IVA, y qué métodos de pago admite cada importe.
 *
 * Todo se calcula en **pesos** y se redondea a dos decimales; la conversión a
 * centavos vive en `toCents` y sólo la usa el adaptador de la pasarela, que es
 * quien tiene esa exigencia.
 */
@Injectable()
export class PricingService {
  /** Desglose de un plan: base + IVA. */
  breakdown(plan: Plan): PriceBreakdown {
    const subtotal = round2(Number(plan.basePrice));
    const taxRate = Number(plan.taxRate);
    const taxAmount = round2(subtotal * taxRate);

    return {
      subtotal,
      taxRate,
      taxAmount,
      total: round2(subtotal + taxAmount),
      currency: plan.currency,
    };
  }

  /**
   * Las pasarelas cobran en la unidad mínima: centavos.
   *
   * Se aplica la misma corrección de épsilon que `round2`: sin ella,
   * `1.005 * 100` vale `100.49999999999999` en coma flotante y se redondearía
   * a 100, perdiendo un centavo en el cobro.
   */
  toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  /**
   * Métodos aceptables para un importe. Las restricciones de OXXO son de
   * Stripe México: sólo pago único, entre $10 y $10,000 MXN. Por eso un plan
   * Alta caro deja de poder pagarse en efectivo — de ahí la advertencia en
   * `Impulso_Jobs_Planes_Suscripciones.md`.
   */
  availableMethods(total: number, recurring: boolean): MethodAvailability[] {
    return [
      { method: PaymentMethod.CARD, available: true, reason: null },
      {
        method: PaymentMethod.SPEI,
        available: true,
        reason: null,
      },
      {
        method: PaymentMethod.MSI,
        available: !recurring,
        reason: recurring
          ? 'Los meses sin intereses no aplican a una suscripción.'
          : null,
      },
      {
        method: PaymentMethod.OXXO,
        ...this.oxxoAvailability(total, recurring),
      },
    ];
  }

  /** `true` si ese método sirve para el importe; base de la validación. */
  isMethodAvailable(
    method: PaymentMethod,
    total: number,
    recurring: boolean,
  ): MethodAvailability {
    const found = this.availableMethods(total, recurring).find(
      (item) => item.method === method,
    );
    return (
      found ?? {
        method,
        available: false,
        reason: 'Método de pago no soportado.',
      }
    );
  }

  private oxxoAvailability(
    total: number,
    recurring: boolean,
  ): { available: boolean; reason: string | null } {
    if (recurring) {
      return {
        available: false,
        reason: 'OXXO no admite pagos recurrentes; usa tarjeta o SPEI.',
      };
    }
    if (total < OXXO_MIN_AMOUNT) {
      return {
        available: false,
        reason: `El importe mínimo para pagar en OXXO es $${OXXO_MIN_AMOUNT} MXN.`,
      };
    }
    if (total > OXXO_MAX_AMOUNT) {
      return {
        available: false,
        reason: `El importe supera el máximo de $${OXXO_MAX_AMOUNT.toLocaleString('es-MX')} MXN que admite OXXO.`,
      };
    }
    return { available: true, reason: null };
  }
}
